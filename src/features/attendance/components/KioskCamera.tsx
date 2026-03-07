import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getFaceDetectorModule,
  getVisionCameraModule,
  DetectedFace,
  NativeCameraPermissionStatus,
} from '../native/camera';

const FACE_DETECTION_OPTIONS = {
  classificationMode: 'all',
  contourMode: 'all',
  landmarkMode: 'all',
  minFaceSize: 0.15,
  performanceMode: 'accurate',
  trackingEnabled: true,
} as const;

export interface KioskCameraHandle {
  takePhoto: () => Promise<string | undefined>;
}

interface KioskCameraProps {
  isActive: boolean;
  onFacesDetected: (faces: DetectedFace[]) => void;
}

function useOptionalFrontCameraDevice() {
  const visionCamera = getVisionCameraModule();

  if (!visionCamera) {
    return null;
  }

  return visionCamera.useCameraDevice('front');
}

export const KioskCamera = forwardRef<KioskCameraHandle, KioskCameraProps>(
  function KioskCamera(props, ref) {
    const cameraRef = useRef<any>(null);
    const [permissionStatus, setPermissionStatus] =
      useState<NativeCameraPermissionStatus>('not-determined');
    const device = useOptionalFrontCameraDevice();
    const visionCamera = getVisionCameraModule();
    const faceDetector = getFaceDetectorModule();

    useEffect(() => {
      if (!visionCamera) {
        return;
      }

      setPermissionStatus(visionCamera.Camera.getCameraPermissionStatus());
    }, [visionCamera]);

    useImperativeHandle(ref, () => ({
      async takePhoto() {
        const photo = await cameraRef.current?.takePhoto({
          enableAutoRedEyeReduction: true,
          flash: 'off',
        });

        return photo?.path;
      },
    }));

    async function requestPermission() {
      if (!visionCamera) {
        return;
      }

      const status = await visionCamera.Camera.requestCameraPermission();
      setPermissionStatus(status);
    }

    if (!visionCamera || !faceDetector) {
      return (
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableTitle}>Camera preview unavailable</Text>
          <Text style={styles.unavailableCopy}>
            Native camera modules are not available in this environment. The
            deployment build will use Vision Camera on device.
          </Text>
        </View>
      );
    }

    if (permissionStatus !== 'granted') {
      return (
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera permission required</Text>
          <Text style={styles.permissionCopy}>
            Allow the front camera so the kiosk can detect faces and capture
            proof photos.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
            ]}>
            <Text style={styles.permissionButtonText}>Enable camera</Text>
          </Pressable>
        </View>
      );
    }

    if (!device) {
      return (
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableTitle}>No front camera found</Text>
          <Text style={styles.unavailableCopy}>
            Connect a tablet with a working front camera to continue.
          </Text>
        </View>
      );
    }

    const FaceCamera = faceDetector.Camera;

    return (
      <View style={styles.wrapper}>
        <FaceCamera
          ref={cameraRef}
          device={device}
          faceDetectionCallback={faces => {
            props.onFacesDetected(faces);
          }}
          faceDetectionOptions={FACE_DETECTION_OPTIONS}
          isActive={props.isActive}
          photo
          style={styles.camera}
        />
        <View style={styles.overlay}>
          <View style={styles.reticle} />
          <Text style={styles.overlayText}>Keep one face in frame</Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayText: {
    color: '#d7f5ef',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#7dd3c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  permissionButtonText: {
    color: '#04131a',
    fontSize: 15,
    fontWeight: '800',
  },
  permissionCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#0c2531',
    padding: 18,
    gap: 12,
    justifyContent: 'center',
  },
  permissionCopy: {
    color: '#c7dde0',
    fontSize: 15,
    lineHeight: 22,
  },
  permissionTitle: {
    color: '#f2fbfa',
    fontSize: 22,
    fontWeight: '800',
  },
  reticle: {
    width: 190,
    height: 190,
    borderRadius: 30,
    borderColor: '#7dd3c7',
    borderWidth: 3,
    backgroundColor: 'rgba(4, 19, 26, 0.22)',
  },
  unavailableCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#0c2531',
    padding: 18,
    gap: 10,
    justifyContent: 'center',
  },
  unavailableCopy: {
    color: '#c7dde0',
    fontSize: 15,
    lineHeight: 22,
  },
  unavailableTitle: {
    color: '#f2fbfa',
    fontSize: 22,
    fontWeight: '800',
  },
  wrapper: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
});

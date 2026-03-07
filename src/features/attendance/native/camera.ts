import type { Face } from 'react-native-vision-camera-face-detector';
import type {
  CameraDevice,
  CameraPermissionStatus,
  PhotoFile,
} from 'react-native-vision-camera';

export type DetectedFace = Face;
export type NativeCameraDevice = CameraDevice;
export type NativeCameraPermissionStatus = CameraPermissionStatus;
export type NativePhotoFile = PhotoFile;

const isTestRuntime = typeof globalThis !== 'undefined' && 'jest' in globalThis;

export function getVisionCameraModule():
  | typeof import('react-native-vision-camera')
  | null {
  if (isTestRuntime) {
    return null;
  }

  try {
    return require('react-native-vision-camera') as typeof import('react-native-vision-camera');
  } catch {
    return null;
  }
}

export function getFaceDetectorModule():
  | typeof import('react-native-vision-camera-face-detector')
  | null {
  if (isTestRuntime) {
    return null;
  }

  try {
    return require('react-native-vision-camera-face-detector') as typeof import('react-native-vision-camera-face-detector');
  } catch {
    return null;
  }
}

export async function detectFacesInImage(imageUri: string): Promise<DetectedFace[]> {
  const faceDetector = getFaceDetectorModule();

  if (!faceDetector) {
    return [];
  }

  return faceDetector.detectFaces({
    image: imageUri,
    options: {
      classificationMode: 'all',
      contourMode: 'all',
      landmarkMode: 'all',
      minFaceSize: 0.15,
      performanceMode: 'accurate',
      trackingEnabled: false,
    },
  });
}

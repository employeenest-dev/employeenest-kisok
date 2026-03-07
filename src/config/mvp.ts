import { NativeModules, Platform } from 'react-native';

import type {
  ApiRuntimeOption,
  ApiRuntimePreset,
  RecognitionThresholds,
} from '../features/attendance/types';

export const DEVICE_ID = 'tablet-frontdesk-01';
export const OFFICE_NAME = 'HQ Entrance';
export const APP_NAME = 'Attendance Kiosk';
const API_PORT = 4000;
const LOCALHOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export const ANDROID_EMULATOR_API_BASE_URL = `http://10.0.2.2:${API_PORT}`;
export const ANDROID_USB_API_BASE_URL = `http://127.0.0.1:${API_PORT}`;
export const IOS_SIMULATOR_API_BASE_URL = `http://localhost:${API_PORT}`;

function getBundleHost(): string | undefined {
  const sourceCode = NativeModules.SourceCode as
    | {
        getConstants?: () => { scriptURL?: string };
        scriptURL?: string;
      }
    | undefined;
  const scriptUrl = sourceCode?.scriptURL ?? sourceCode?.getConstants?.().scriptURL;

  if (!scriptUrl) {
    return undefined;
  }

  try {
    const host = new URL(scriptUrl).hostname;
    return host === '::1' ? 'localhost' : host;
  } catch {
    return undefined;
  }
}

function buildPhysicalDeviceApiBaseUrl(): string | undefined {
  const bundleHost = getBundleHost();

  if (!bundleHost || LOCALHOSTS.has(bundleHost)) {
    return undefined;
  }

  return `http://${bundleHost}:${API_PORT}`;
}

function isPrivateNetworkHost(hostname: string): boolean {
  return (
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
  );
}

export const PHYSICAL_DEVICE_API_BASE_URL = buildPhysicalDeviceApiBaseUrl();

export const API_RUNTIME_OPTIONS: ApiRuntimeOption[] = [
  {
    description: 'Use 10.0.2.2 so the Android emulator can reach your computer.',
    id: 'android-emulator',
    label: 'Android emulator',
    suggestedUrl: ANDROID_EMULATOR_API_BASE_URL,
  },
  {
    description:
      'Use 127.0.0.1 when an Android phone is connected by USB and adb reverse is enabled.',
    id: 'android-usb',
    label: 'Android USB',
    suggestedUrl: ANDROID_USB_API_BASE_URL,
  },
  {
    description: 'Use localhost so the iOS simulator can reach your computer.',
    id: 'ios-simulator',
    label: 'iOS simulator',
    suggestedUrl: IOS_SIMULATOR_API_BASE_URL,
  },
  {
    description: PHYSICAL_DEVICE_API_BASE_URL
      ? `Use your computer over Wi-Fi at ${PHYSICAL_DEVICE_API_BASE_URL}.`
      : 'Use your computer LAN IP over Wi-Fi, then save it below.',
    id: 'physical-device',
    label: 'Physical device',
    suggestedUrl: PHYSICAL_DEVICE_API_BASE_URL,
  },
  {
    description: 'Use any other backend URL.',
    id: 'custom',
    label: 'Custom',
  },
];

export function getApiBaseUrlForRuntimePreset(
  preset: ApiRuntimePreset,
): string | undefined {
  switch (preset) {
    case 'android-emulator':
      return ANDROID_EMULATOR_API_BASE_URL;
    case 'android-usb':
      return ANDROID_USB_API_BASE_URL;
    case 'ios-simulator':
      return IOS_SIMULATOR_API_BASE_URL;
    case 'physical-device':
      return PHYSICAL_DEVICE_API_BASE_URL;
    case 'custom':
    default:
      return undefined;
  }
}

export function inferApiRuntimePreset(baseUrl: string): ApiRuntimePreset {
  try {
    const hostname = new URL(baseUrl).hostname;

    if (hostname === '10.0.2.2') {
      return 'android-emulator';
    }

    if (Platform.OS === 'android' && (hostname === '127.0.0.1' || hostname === 'localhost')) {
      return 'android-usb';
    }

    if (LOCALHOSTS.has(hostname) && Platform.OS === 'ios') {
      return 'ios-simulator';
    }

    if (
      (PHYSICAL_DEVICE_API_BASE_URL &&
        hostname === new URL(PHYSICAL_DEVICE_API_BASE_URL).hostname) ||
      isPrivateNetworkHost(hostname)
    ) {
      return 'physical-device';
    }
  } catch {
    return 'custom';
  }

  return 'custom';
}

function getDefaultApiBaseUrl(): string {
  if (PHYSICAL_DEVICE_API_BASE_URL) {
    return PHYSICAL_DEVICE_API_BASE_URL;
  }

  return (
    Platform.select({
      android: ANDROID_EMULATOR_API_BASE_URL,
      ios: IOS_SIMULATOR_API_BASE_URL,
      default: IOS_SIMULATOR_API_BASE_URL,
    }) ?? IOS_SIMULATOR_API_BASE_URL
  );
}

export const DEFAULT_API_BASE_URL = getDefaultApiBaseUrl();

export const RECOGNITION_THRESHOLDS: RecognitionThresholds = {
  autoMatch: 0.75,
  reviewMatch: 0.6,
};

export const MVP_DELIVERY_TRACK = [
  'Single-face camera gating on the front tablet camera',
  'Manual attendance with proof photo capture and offline queue',
  'Employee sync, attendance sync, and health checks against the backend',
  'Recognition adapter boundary ready for TFLite embedding integration',
];

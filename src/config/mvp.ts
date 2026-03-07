import { Platform } from 'react-native';

import { RecognitionThresholds } from '../features/attendance/types';

export const DEVICE_ID = 'tablet-frontdesk-01';
export const OFFICE_NAME = 'HQ Entrance';
export const APP_NAME = 'Attendance Kiosk';

export const DEFAULT_API_BASE_URL = 'http://localhost:4000';

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

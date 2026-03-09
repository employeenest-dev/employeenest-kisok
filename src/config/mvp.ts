import { RecognitionThresholds } from '../features/attendance/types';

export const DEVICE_ID = 'tablet-frontdesk-01';
export const OFFICE_NAME = 'HQ Entrance';
export const APP_NAME = 'Attendance Kiosk (Offline)';

export const RECOGNITION_THRESHOLDS: RecognitionThresholds = {
  autoMatch: 0.75,
  reviewMatch: 0.6,
};

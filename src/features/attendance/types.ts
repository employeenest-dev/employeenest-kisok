export type AttendanceType = 'CHECKIN' | 'CHECKOUT';
export type AttendanceMethod = 'FACE' | 'MANUAL';
export type MatchOutcome = 'AUTO' | 'REVIEW' | 'MANUAL' | 'UNAVAILABLE';
export type ActivePanel = 'manual' | 'none' | 'settings';
export type AppMode = 'admin' | 'kiosk';
export type EmployeeEditorMode = 'create' | 'edit' | 'view';

export interface RecognitionThresholds {
  autoMatch: number;
  reviewMatch: number;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  team: string;
  faceEmbedding: number[];
  embeddingVersion: number;
  faceImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastAttendanceType?: AttendanceType;
}

export interface AttendanceRecord {
  id: string;
  syncId: string;
  employeeId: string;
  employeeName?: string;
  timestamp: string;
  type: AttendanceType;
  method: AttendanceMethod;
  confidence?: number;
  photoUrl?: string;
  deviceId: string;
  createdAt: string;
  status?: 'pending' | 'synced';
}

export interface PendingAttendanceRecord {
  localId: string;
  syncId: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  type: AttendanceType;
  method: AttendanceMethod;
  confidence?: number;
  photoUri?: string;
  deviceId: string;
  createdAt: string;
  failureReason?: string;
}

export interface SyncState {
  employeeCount: number;
  pendingUploads: number;
  syncing: boolean;
  lastEmployeesSyncAt?: string;
  lastAttendanceSyncAt?: string;
  lastError?: string;
}

export interface ManualDraft {
  employeeQuery: string;
  selectedEmployeeId?: string;
  type: AttendanceType;
  photoUri?: string;
}

export interface OnboardingDraft {
  id?: string;
  name: string;
  employeeId: string;
  team: string;
  photoUri?: string;
  faceEmbedding?: number[];
  faceImageUrl?: string;
  embeddingVersion?: number;
}

export interface ApiSettings {
  baseUrl: string;
  draftBaseUrl: string;
}

export interface RecognitionStatus {
  availability: 'ready' | 'unavailable';
  faceCount: number;
  message: string;
  outcome: MatchOutcome;
  confidence?: number;
  matchedEmployeeId?: string;
  matchedEmployeeName?: string;
}

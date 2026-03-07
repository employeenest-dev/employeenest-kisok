export type AttendanceType = 'CHECKIN' | 'CHECKOUT';
export type AttendanceMethod = 'FACE' | 'MANUAL';

export interface EmployeeRecord {
  id: string;
  employeeId: string;
  name: string;
  team: string;
  faceEmbedding: number[];
  embeddingVersion: number;
  faceImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  syncId: string;
  employeeId: string;
  timestamp: string;
  type: AttendanceType;
  method: AttendanceMethod;
  confidence?: number;
  photoUrl?: string;
  deviceId: string;
  createdAt: string;
}

export interface AttendanceFilter {
  employeeId?: string;
  limit?: number;
}

export interface DataStore {
  listEmployees(): Promise<EmployeeRecord[]>;
  getEmployeeById(id: string): Promise<EmployeeRecord | null>;
  createEmployee(employee: EmployeeRecord): Promise<EmployeeRecord>;
  updateEmployee(employee: EmployeeRecord): Promise<EmployeeRecord>;
  listAttendance(filter?: AttendanceFilter): Promise<AttendanceRecord[]>;
  getAttendanceBySyncId(syncId: string): Promise<AttendanceRecord | null>;
  createAttendance(record: AttendanceRecord): Promise<AttendanceRecord>;
  close?(): Promise<void>;
}

export interface SavedObject {
  key: string;
  url: string;
}

export interface SaveUploadInput {
  buffer: Buffer;
  contentType: string;
  originalName: string;
  prefix: string;
}

export interface ObjectStorage {
  saveUpload(input: SaveUploadInput): Promise<SavedObject>;
}

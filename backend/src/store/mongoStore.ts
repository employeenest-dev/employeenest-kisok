import mongoose, { InferSchemaType, Model, Schema } from 'mongoose';

import { AttendanceFilter, AttendanceRecord, DataStore, EmployeeRecord } from '../types';

const employeeSchema = new Schema<EmployeeRecord>(
  {
    id: { required: true, type: String, unique: true },
    employeeId: { required: true, type: String, unique: true },
    name: { required: true, type: String },
    team: { required: true, type: String },
    faceEmbedding: { default: [], required: true, type: [Number] },
    embeddingVersion: { default: 1, required: true, type: Number },
    faceImageUrl: { type: String },
    createdAt: { required: true, type: String },
    updatedAt: { required: true, type: String },
  },
  {
    collection: 'employees',
    versionKey: false,
  },
);

const attendanceSchema = new Schema<AttendanceRecord>(
  {
    id: { required: true, type: String, unique: true },
    syncId: { required: true, type: String, unique: true },
    employeeId: { required: true, type: String },
    timestamp: { required: true, type: String },
    type: { enum: ['CHECKIN', 'CHECKOUT'], required: true, type: String },
    method: { enum: ['FACE', 'MANUAL'], required: true, type: String },
    confidence: { type: Number },
    photoUrl: { type: String },
    deviceId: { required: true, type: String },
    createdAt: { required: true, type: String },
  },
  {
    collection: 'attendance',
    versionKey: false,
  },
);

type EmployeeDocument = InferSchemaType<typeof employeeSchema>;
type AttendanceDocument = InferSchemaType<typeof attendanceSchema>;

function toEmployeeRecord(document: EmployeeDocument): EmployeeRecord {
  return {
    id: document.id,
    employeeId: document.employeeId,
    name: document.name,
    team: document.team,
    faceEmbedding: [...document.faceEmbedding],
    embeddingVersion: document.embeddingVersion,
    faceImageUrl: document.faceImageUrl,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toAttendanceRecord(document: AttendanceDocument): AttendanceRecord {
  return {
    id: document.id,
    syncId: document.syncId,
    employeeId: document.employeeId,
    timestamp: document.timestamp,
    type: document.type,
    method: document.method,
    confidence: document.confidence,
    photoUrl: document.photoUrl,
    deviceId: document.deviceId,
    createdAt: document.createdAt,
  };
}

export class MongoStore implements DataStore {
  private readonly attendanceModel: Model<AttendanceDocument>;
  private readonly employeeModel: Model<EmployeeDocument>;

  constructor() {
    this.employeeModel = mongoose.models.Employee
      ? (mongoose.models.Employee as Model<EmployeeDocument>)
      : mongoose.model<EmployeeDocument>('Employee', employeeSchema);
    this.attendanceModel = mongoose.models.Attendance
      ? (mongoose.models.Attendance as Model<AttendanceDocument>)
      : mongoose.model<AttendanceDocument>('Attendance', attendanceSchema);
  }

  static async connect(uri: string, dbName: string): Promise<MongoStore> {
    await mongoose.connect(uri, { dbName });
    return new MongoStore();
  }

  async listEmployees(): Promise<EmployeeRecord[]> {
    const documents = await this.employeeModel.find().sort({ name: 1 }).lean();
    return documents.map(toEmployeeRecord);
  }

  async getEmployeeById(id: string): Promise<EmployeeRecord | null> {
    const document = await this.employeeModel.findOne({ id }).lean();
    return document ? toEmployeeRecord(document) : null;
  }

  async createEmployee(employee: EmployeeRecord): Promise<EmployeeRecord> {
    const created = await this.employeeModel.create(employee);
    return toEmployeeRecord(created.toObject());
  }

  async updateEmployee(employee: EmployeeRecord): Promise<EmployeeRecord> {
    const updated = await this.employeeModel
      .findOneAndReplace({ id: employee.id }, employee, {
        new: true,
      })
      .lean();

    if (!updated) {
      throw new Error('Employee not found.');
    }

    return toEmployeeRecord(updated);
  }

  async listAttendance(filter?: AttendanceFilter): Promise<AttendanceRecord[]> {
    const query = filter?.employeeId ? { employeeId: filter.employeeId } : {};
    const cursor = this.attendanceModel.find(query).sort({ timestamp: -1 });

    if (filter?.limit) {
      cursor.limit(filter.limit);
    }

    const documents = await cursor.lean();
    return documents.map(toAttendanceRecord);
  }

  async getAttendanceBySyncId(syncId: string): Promise<AttendanceRecord | null> {
    const document = await this.attendanceModel.findOne({ syncId }).lean();
    return document ? toAttendanceRecord(document) : null;
  }

  async createAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const created = await this.attendanceModel.create(record);
    return toAttendanceRecord(created.toObject());
  }

  async close(): Promise<void> {
    await mongoose.disconnect();
  }
}

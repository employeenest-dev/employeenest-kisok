import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AttendanceFilter, AttendanceRecord, DataStore, EmployeeRecord } from '../types';

interface FileDatabase {
  attendance: AttendanceRecord[];
  employees: EmployeeRecord[];
}

const EMPTY_DATABASE: FileDatabase = {
  attendance: [],
  employees: [],
};

export class FileStore implements DataStore {
  private cache: FileDatabase | null = null;

  constructor(private readonly filePath: string) {}

  private async load(): Promise<FileDatabase> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as FileDatabase;
      this.cache = {
        attendance: parsed.attendance ?? [],
        employees: parsed.employees ?? [],
      };
    } catch {
      this.cache = EMPTY_DATABASE;
      await this.persist();
    }

    return this.cache;
  }

  private async persist(): Promise<void> {
    const data = this.cache ?? EMPTY_DATABASE;
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const tempFile = `${this.filePath}.tmp`;
    await writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
    await rename(tempFile, this.filePath);
  }

  async listEmployees(): Promise<EmployeeRecord[]> {
    const db = await this.load();
    return [...db.employees].sort((left, right) => left.name.localeCompare(right.name));
  }

  async getEmployeeById(id: string): Promise<EmployeeRecord | null> {
    const db = await this.load();
    return db.employees.find(employee => employee.id === id) ?? null;
  }

  async createEmployee(employee: EmployeeRecord): Promise<EmployeeRecord> {
    const db = await this.load();
    db.employees.push(employee);
    await this.persist();
    return employee;
  }

  async updateEmployee(employee: EmployeeRecord): Promise<EmployeeRecord> {
    const db = await this.load();
    const index = db.employees.findIndex(entry => entry.id === employee.id);

    if (index === -1) {
      throw new Error('Employee not found.');
    }

    db.employees[index] = employee;
    await this.persist();
    return employee;
  }

  async listAttendance(filter?: AttendanceFilter): Promise<AttendanceRecord[]> {
    const db = await this.load();
    let records = [...db.attendance];

    if (filter?.employeeId) {
      records = records.filter(record => record.employeeId === filter.employeeId);
    }

    records.sort((left, right) => right.timestamp.localeCompare(left.timestamp));

    if (filter?.limit) {
      return records.slice(0, filter.limit);
    }

    return records;
  }

  async getAttendanceBySyncId(syncId: string): Promise<AttendanceRecord | null> {
    const db = await this.load();
    return db.attendance.find(record => record.syncId === syncId) ?? null;
  }

  async createAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const db = await this.load();
    db.attendance.push(record);
    await this.persist();
    return record;
  }
}

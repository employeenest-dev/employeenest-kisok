import {
  AttendanceRecord,
  AttendanceType,
  Employee,
  PendingAttendanceRecord,
} from '../types';
import { createId } from './id';

export function sortEmployees(employees: Employee[]): Employee[] {
  return [...employees].sort((left, right) => left.name.localeCompare(right.name));
}

export function filterEmployees(employees: Employee[], query: string): Employee[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return sortEmployees(employees);
  }

  return sortEmployees(
    employees.filter(employee => {
      const haystack = `${employee.name} ${employee.employeeId} ${employee.team}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    }),
  );
}

export function buildPendingAttendance(args: {
  confidence?: number;
  deviceId: string;
  employee: Employee;
  method: PendingAttendanceRecord['method'];
  photoUri?: string;
  timestamp?: string;
  type: AttendanceType;
}): PendingAttendanceRecord {
  const timestamp = args.timestamp ?? new Date().toISOString();

  return {
    createdAt: timestamp,
    deviceId: args.deviceId,
    employeeId: args.employee.id,
    employeeName: args.employee.name,
    confidence: args.confidence,
    localId: createId('local'),
    method: args.method,
    photoUri: args.photoUri,
    syncId: createId('sync'),
    timestamp,
    type: args.type,
  };
}

export function applyLastAttendanceTypes(
  employees: Employee[],
  recentAttendance: AttendanceRecord[],
  pendingAttendance: PendingAttendanceRecord[],
): Employee[] {
  const lastTypeByEmployee = new Map<string, AttendanceType>();
  const combined = [...recentAttendance, ...pendingAttendance].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  );

  for (const record of combined) {
    if (!lastTypeByEmployee.has(record.employeeId)) {
      lastTypeByEmployee.set(record.employeeId, record.type);
    }
  }

  return employees.map(employee => ({
    ...employee,
    lastAttendanceType:
      lastTypeByEmployee.get(employee.id) ?? employee.lastAttendanceType,
  }));
}

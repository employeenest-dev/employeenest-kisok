import {
  AttendanceRecord,
  AttendanceType,
  Employee,
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

export function buildAttendanceRecord(args: {
  confidence?: number;
  deviceId: string;
  employee: Employee;
  method: AttendanceRecord['method'];
  photoUrl?: string;
  timestamp?: string;
  type: AttendanceType;
}): AttendanceRecord {
  const timestamp = args.timestamp ?? new Date().toISOString();

  return {
    createdAt: timestamp,
    deviceId: args.deviceId,
    employeeId: args.employee.id,
    employeeName: args.employee.name,
    confidence: args.confidence,
    id: createId('rec'),
    method: args.method,
    photoUrl: args.photoUrl,
    timestamp,
    type: args.type,
  };
}

export function applyLastAttendanceTypes(
  employees: Employee[],
  recentAttendance: AttendanceRecord[],
): Employee[] {
  const lastTypeByEmployee = new Map<string, AttendanceType>();
  const sortedHistory = [...recentAttendance].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  );

  for (const record of sortedHistory) {
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

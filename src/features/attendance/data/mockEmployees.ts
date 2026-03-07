import { Employee } from '../types';

const now = new Date().toISOString();

export const mockEmployees: Employee[] = [
  {
    id: 'emp_001',
    employeeId: 'NAT-001',
    name: 'Pranav Rao',
    team: 'Engineering',
    faceEmbedding: [],
    embeddingVersion: 3,
    createdAt: now,
    updatedAt: now,
    lastAttendanceType: 'CHECKIN',
  },
  {
    id: 'emp_002',
    employeeId: 'NAT-014',
    name: 'Asha Menon',
    team: 'People Ops',
    faceEmbedding: [],
    embeddingVersion: 2,
    createdAt: now,
    updatedAt: now,
    lastAttendanceType: 'CHECKOUT',
  },
  {
    id: 'emp_003',
    employeeId: 'NAT-021',
    name: 'Karan Shah',
    team: 'Finance',
    faceEmbedding: [],
    embeddingVersion: 4,
    createdAt: now,
    updatedAt: now,
  },
];

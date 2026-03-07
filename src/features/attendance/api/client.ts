import axios from 'axios';

import {
  AttendanceRecord,
  Employee,
  OnboardingDraft,
  PendingAttendanceRecord,
} from '../types';

function createHttpClient(baseUrl: string, timeout = 10_000) {
  return axios.create({
    baseURL: baseUrl.replace(/\/$/, ''),
    timeout,
  });
}

function buildFilePayload(uri: string, fileName: string) {
  return {
    name: fileName,
    type: 'image/jpeg',
    uri,
  } as never;
}

export async function fetchEmployees(baseUrl: string): Promise<Employee[]> {
  const response = await createHttpClient(baseUrl).get('/employees');
  return (response.data.employees ?? []) as Employee[];
}

export async function fetchAttendance(baseUrl: string, limit = 12): Promise<AttendanceRecord[]> {
  const response = await createHttpClient(baseUrl).get('/attendance', {
    params: { limit },
  });
  return (response.data.attendance ?? []) as AttendanceRecord[];
}

export async function fetchHealth(baseUrl: string, timeoutMs = 10_000): Promise<{
  databaseMode: string;
  status: string;
  storageMode: string;
}> {
  const response = await createHttpClient(baseUrl, timeoutMs).get('/health');
  return response.data as {
    databaseMode: string;
    status: string;
    storageMode: string;
  };
}

export async function createEmployee(baseUrl: string, draft: OnboardingDraft): Promise<Employee> {
  const formData = buildEmployeeFormData(draft);
  const endpoint = `${baseUrl.replace(/\/$/, '')}/employees`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create employee: ${errorText}`);
  }

  const data = await response.json();
  return data.employee as Employee;
}

function buildEmployeeFormData(draft: OnboardingDraft): FormData {
  const formData = new FormData();
  formData.append('name', draft.name);
  formData.append('employeeId', draft.employeeId);
  formData.append('team', draft.team);

  if (draft.faceEmbedding) {
    formData.append('embedding', JSON.stringify(draft.faceEmbedding));
  }

  if (typeof draft.embeddingVersion === 'number') {
    formData.append('embeddingVersion', String(draft.embeddingVersion));
  }

  if (draft.photoUri) {
    formData.append(
      'faceImage',
      buildFilePayload(draft.photoUri, `employee-${draft.employeeId}.jpg`),
    );
  }

  return formData;
}

export async function updateEmployee(baseUrl: string, draft: OnboardingDraft): Promise<Employee> {
  if (!draft.id) {
    throw new Error('Employee update requires an employee id.');
  }

  const formData = buildEmployeeFormData(draft);
  const endpoint = `${baseUrl.replace(/\/$/, '')}/employees/${draft.id}`;

  const response = await fetch(endpoint, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update employee: ${errorText}`);
  }

  const data = await response.json();
  return data.employee as Employee;
}

export async function createAttendance(
  baseUrl: string,
  record: PendingAttendanceRecord,
): Promise<AttendanceRecord> {
  const formData = new FormData();
  formData.append('employeeId', record.employeeId);
  formData.append('type', record.type);
  formData.append('method', record.method);
  formData.append('deviceId', record.deviceId);
  formData.append('timestamp', record.timestamp);
  formData.append('syncId', record.syncId);

  if (typeof record.confidence === 'number') {
    formData.append('confidence', String(record.confidence));
  }

  if (record.photoUri) {
    formData.append(
      'photo',
      buildFilePayload(record.photoUri, `attendance-${record.syncId}.jpg`),
    );
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/attendance`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create attendance: ${errorText}`);
  }

  const data = await response.json();
  return data.attendance as AttendanceRecord;
}

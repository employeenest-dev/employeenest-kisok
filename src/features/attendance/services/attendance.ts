import { AttendanceRecord, AttendanceType } from '../types';

export function getNextAttendanceType(lastAttendanceType?: AttendanceType): AttendanceType {
  return lastAttendanceType === 'CHECKIN' ? 'CHECKOUT' : 'CHECKIN';
}

export function normalizePhotoUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function formatDistance(timestamp?: string): string {
  if (!timestamp) {
    return 'Never';
  }

  const difference = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(difference / 60_000);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(timestamp));
}

export function describeAttendance(record: AttendanceRecord): string {
  const method = record.method === 'FACE' ? 'Face' : 'Manual';
  return `${record.type} via ${method}`;
}

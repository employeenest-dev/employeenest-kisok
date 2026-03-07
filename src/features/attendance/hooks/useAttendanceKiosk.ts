import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import {
  DEFAULT_API_BASE_URL,
  DEVICE_ID,
  RECOGNITION_THRESHOLDS,
} from '../../../config/mvp';
import {
  createAttendance,
  createEmployee,
  fetchAttendance,
  fetchEmployees,
  updateEmployee,
} from '../api/client';
import { mockEmployees } from '../data/mockEmployees';
import { detectFacesInImage, DetectedFace } from '../native/camera';
import { buildFaceEmbedding } from '../services/faceEmbedding';
import { readStoredJson, readStoredString, writeStoredJson, writeStoredString } from '../services/localStore';
import { buildPendingAttendance, filterEmployees, sortEmployees, applyLastAttendanceTypes } from '../services/queue';
import { evaluateRecognition } from '../services/recognition';
import {
  ActivePanel,
  ApiSettings,
  AppMode,
  AttendanceRecord,
  Employee,
  EmployeeEditorMode,
  ManualDraft,
  OnboardingDraft,
  PendingAttendanceRecord,
  RecognitionStatus,
  SyncState,
} from '../types';
import { getNextAttendanceType } from '../services/attendance';

const STORAGE_KEYS = {
  apiBaseUrl: 'attendance.api-base-url',
  employees: 'attendance.employees',
  lastAttendanceSyncAt: 'attendance.last-attendance-sync-at',
  lastEmployeesSyncAt: 'attendance.last-employees-sync-at',
  pendingAttendance: 'attendance.pending-attendance',
  recentAttendance: 'attendance.recent-attendance',
} as const;

const runtimeProcess = (
  globalThis as {
    process?: {
      env?: {
        JEST_WORKER_ID?: string;
        NODE_ENV?: string;
      };
    };
  }
).process;
const isTestRuntime =
  runtimeProcess?.env?.NODE_ENV === 'test' || !!runtimeProcess?.env?.JEST_WORKER_ID;

const EMPTY_MANUAL_DRAFT: ManualDraft = {
  employeeQuery: '',
  type: 'CHECKIN',
};

const EMPTY_EMPLOYEE_DRAFT: OnboardingDraft = {
  employeeId: '',
  embeddingVersion: 1,
  name: '',
  team: '',
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error.';
}

function addEmployeeNames(records: AttendanceRecord[], employees: Employee[]): AttendanceRecord[] {
  return records.map(record => ({
    ...record,
    employeeName:
      employees.find(employee => employee.id === record.employeeId)?.name ??
      record.employeeName,
  }));
}

function draftFromEmployee(employee: Employee): OnboardingDraft {
  return {
    employeeId: employee.employeeId,
    embeddingVersion: employee.embeddingVersion,
    faceEmbedding: employee.faceEmbedding,
    faceImageUrl: employee.faceImageUrl,
    id: employee.id,
    name: employee.name,
    team: employee.team,
  };
}

export function useAttendanceKiosk() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [apiUrlDraft, setApiUrlDraft] = useState(DEFAULT_API_BASE_URL);
  const [appMode, setAppMode] = useState<AppMode>('admin');
  const [employeeEditorMode, setEmployeeEditorMode] =
    useState<EmployeeEditorMode>('view');
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeDraft, setEmployeeDraft] =
    useState<OnboardingDraft>(EMPTY_EMPLOYEE_DRAFT);
  const [initialized, setInitialized] = useState(false);
  const [lastAttendanceSyncAt, setLastAttendanceSyncAt] = useState<string | undefined>();
  const [lastEmployeesSyncAt, setLastEmployeesSyncAt] = useState<string | undefined>();
  const [lastError, setLastError] = useState<string | undefined>();
  const [manualDraft, setManualDraft] = useState<ManualDraft>(EMPTY_MANUAL_DRAFT);
  const [pendingAttendance, setPendingAttendance] = useState<PendingAttendanceRecord[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>(
    evaluateRecognition({
      employees: [],
      faceCount: 0,
      thresholds: RECOGNITION_THRESHOLDS,
    }),
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();
  const [syncing, setSyncing] = useState(false);

  const autoAttendanceRef = useRef<{ employeeId: string; timestamp: number } | null>(null);
  const deferredDirectoryQuery = useDeferredValue(employeeQuery);
  const deferredManualQuery = useDeferredValue(manualDraft.employeeQuery);
  const employeesWithAttendance = applyLastAttendanceTypes(
    employees,
    recentAttendance,
    pendingAttendance,
  );
  const filteredEmployees = filterEmployees(employeesWithAttendance, deferredManualQuery);
  const directoryEmployees = filterEmployees(
    employeesWithAttendance,
    deferredDirectoryQuery,
  );
  const selectedEmployee =
    employeesWithAttendance.find(employee => employee.id === selectedEmployeeId) ??
    directoryEmployees[0];
  const matchedEmployee = recognitionStatus.matchedEmployeeId
    ? employeesWithAttendance.find(
      employee => employee.id === recognitionStatus.matchedEmployeeId,
    )
    : undefined;

  useEffect(() => {
    const storedEmployees = readStoredJson<Employee[]>(STORAGE_KEYS.employees, mockEmployees);
    const storedPending = readStoredJson<PendingAttendanceRecord[]>(
      STORAGE_KEYS.pendingAttendance,
      [],
    );
    const storedRecent = readStoredJson<AttendanceRecord[]>(STORAGE_KEYS.recentAttendance, []);
    const storedApiUrl = readStoredString(STORAGE_KEYS.apiBaseUrl, DEFAULT_API_BASE_URL);
    const storedEmployeesSyncAt = readStoredString(
      STORAGE_KEYS.lastEmployeesSyncAt,
      '',
    );
    const storedAttendanceSyncAt = readStoredString(
      STORAGE_KEYS.lastAttendanceSyncAt,
      '',
    );

    const nextEmployees = sortEmployees(storedEmployees);

    setEmployees(nextEmployees);
    setPendingAttendance(storedPending);
    setRecentAttendance(storedRecent);
    setApiBaseUrl(storedApiUrl);
    setApiUrlDraft(storedApiUrl);
    setLastEmployeesSyncAt(storedEmployeesSyncAt || undefined);
    setLastAttendanceSyncAt(storedAttendanceSyncAt || undefined);
    setSelectedEmployeeId(nextEmployees[0]?.id);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    writeStoredJson(STORAGE_KEYS.employees, employees);
    writeStoredJson(STORAGE_KEYS.pendingAttendance, pendingAttendance);
    writeStoredJson(STORAGE_KEYS.recentAttendance, recentAttendance);
    writeStoredString(STORAGE_KEYS.apiBaseUrl, apiBaseUrl);
    writeStoredString(STORAGE_KEYS.lastEmployeesSyncAt, lastEmployeesSyncAt ?? '');
    writeStoredString(STORAGE_KEYS.lastAttendanceSyncAt, lastAttendanceSyncAt ?? '');
  }, [
    apiBaseUrl,
    employees,
    initialized,
    lastAttendanceSyncAt,
    lastEmployeesSyncAt,
    pendingAttendance,
    recentAttendance,
  ]);

  useEffect(() => {
    if (!selectedEmployeeId && employeesWithAttendance.length > 0) {
      setSelectedEmployeeId(employeesWithAttendance[0].id);
    }
  }, [employeesWithAttendance, selectedEmployeeId]);

  async function syncEmployees() {
    const remoteEmployees = await fetchEmployees(apiBaseUrl);
    const syncedAt = new Date().toISOString();
    const nextEmployees = sortEmployees(
      remoteEmployees.length > 0 ? remoteEmployees : mockEmployees,
    );

    startTransition(() => {
      setEmployees(nextEmployees);
      setLastEmployeesSyncAt(syncedAt);
      setSelectedEmployeeId(previous => previous ?? nextEmployees[0]?.id);
    });

    return nextEmployees;
  }

  async function syncAttendanceRecords(sourceEmployees = employees) {
    const remoteAttendance = await fetchAttendance(apiBaseUrl);
    const syncedAt = new Date().toISOString();

    startTransition(() => {
      setRecentAttendance(addEmployeeNames(remoteAttendance, sourceEmployees));
      setLastAttendanceSyncAt(syncedAt);
    });
  }

  async function flushPendingAttendance() {
    if (pendingAttendance.length === 0) {
      return;
    }

    let remaining = [...pendingAttendance];

    for (const record of pendingAttendance) {
      await createAttendance(apiBaseUrl, record);
      remaining = remaining.filter(item => item.localId !== record.localId);
    }

    startTransition(() => {
      setPendingAttendance(remaining);
      setLastAttendanceSyncAt(new Date().toISOString());
    });
  }

  async function syncEverything() {
    setSyncing(true);

    try {
      const syncedEmployees = await syncEmployees();
      await flushPendingAttendance();
      await syncAttendanceRecords(syncedEmployees);
      setLastError(undefined);
    } catch (error) {
      setLastError(`Sync failed: ${getErrorMessage(error)}`);
    } finally {
      setSyncing(false);
    }
  }

  const runAutoSync = useEffectEvent(async () => {
    await syncEverything();
  });

  useEffect(() => {
    if (!initialized || isTestRuntime) {
      return;
    }

    runAutoSync().catch(error => {
      setLastError(`Sync failed: ${getErrorMessage(error)}`);
    });
  }, [apiBaseUrl, initialized]);

  function resetManualDraft(nextType?: ManualDraft['type']) {
    setManualDraft({
      ...EMPTY_MANUAL_DRAFT,
      type: nextType ?? EMPTY_MANUAL_DRAFT.type,
    });
  }

  function resetEmployeeDraft() {
    setEmployeeDraft(EMPTY_EMPLOYEE_DRAFT);
  }

  function beginCreateEmployee() {
    setEmployeeEditorMode('create');
    setEmployeeDraft(EMPTY_EMPLOYEE_DRAFT);
    setSelectedEmployeeId(undefined);
    setLastError(undefined);
  }

  function selectEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setEmployeeEditorMode('view');
    setEmployeeDraft(EMPTY_EMPLOYEE_DRAFT);
    setLastError(undefined);
  }

  function beginEditEmployee(employee: Employee) {
    setSelectedEmployeeId(employee.id);
    setEmployeeEditorMode('edit');
    setEmployeeDraft(draftFromEmployee(employee));
    setLastError(undefined);
  }

  function cancelEmployeeEditor() {
    setEmployeeEditorMode('view');
    setEmployeeDraft(EMPTY_EMPLOYEE_DRAFT);
    setLastError(undefined);
    setSelectedEmployeeId(previous => previous ?? employeesWithAttendance[0]?.id);
  }

  async function saveAttendanceRecord(
    record: PendingAttendanceRecord,
    employeeName: string,
  ) {
    startTransition(() => {
      setPendingAttendance(previous => [record, ...previous]);
    });

    try {
      const saved = await createAttendance(apiBaseUrl, record);

      startTransition(() => {
        setPendingAttendance(previous =>
          previous.filter(item => item.localId !== record.localId),
        );
        setRecentAttendance(previous => [
          {
            ...saved,
            employeeName,
            status: 'synced',
          },
          ...previous,
        ]);
        setLastAttendanceSyncAt(new Date().toISOString());
      });
    } catch (error) {
      setLastError(`Attendance queued offline: ${getErrorMessage(error)}`);
    }
  }

  async function submitFaceAttendance(employee: Employee, confidence?: number) {
    const lastAutoAction = autoAttendanceRef.current;

    if (
      lastAutoAction &&
      lastAutoAction.employeeId === employee.id &&
      Date.now() - lastAutoAction.timestamp < 20_000
    ) {
      return;
    }

    autoAttendanceRef.current = {
      employeeId: employee.id,
      timestamp: Date.now(),
    };

    const pendingRecord = buildPendingAttendance({
      confidence,
      deviceId: DEVICE_ID,
      employee,
      method: 'FACE',
      type: getNextAttendanceType(employee.lastAttendanceType),
    });

    await saveAttendanceRecord(pendingRecord, employee.name);
  }

  function handleFacesDetected(faces: DetectedFace[]) {
    const embedding = faces.length === 1 ? buildFaceEmbedding(faces[0]) : undefined;
    const nextStatus = evaluateRecognition({
      embedding,
      employees: employeesWithAttendance,
      faceCount: faces.length,
      thresholds: RECOGNITION_THRESHOLDS,
    });

    setRecognitionStatus(nextStatus);

    if (
      appMode === 'kiosk' &&
      nextStatus.outcome === 'AUTO' &&
      nextStatus.matchedEmployeeId
    ) {
      const employee = employeesWithAttendance.find(
        entry => entry.id === nextStatus.matchedEmployeeId,
      );

      if (employee) {
        submitFaceAttendance(employee, nextStatus.confidence).catch(error => {
          setLastError(`Automatic attendance failed: ${getErrorMessage(error)}`);
        });
      }
    }
  }

  async function applyEmployeePhoto(uri: string) {
    try {
      const faces = await detectFacesInImage(uri);

      if (faces.length !== 1) {
        setLastError(
          faces.length === 0
            ? 'No face detected in the enrollment photo.'
            : 'Only one face can be used for enrollment.',
        );
        return;
      }

      const embedding = buildFaceEmbedding(faces[0]);

      setEmployeeDraft(previous => ({
        ...previous,
        embeddingVersion: (previous.embeddingVersion ?? 0) + 1,
        faceEmbedding: embedding,
        photoUri: uri,
      }));
      setLastError(undefined);
    } catch (error) {
      setLastError(`Face enrollment failed: ${getErrorMessage(error)}`);
    }
  }

  function applyManualPhoto(uri: string) {
    setManualDraft(previous => ({
      ...previous,
      photoUri: uri,
    }));
    setLastError(undefined);
  }

  async function submitManualAttendance() {
    if (!manualDraft.selectedEmployeeId) {
      setLastError('Select an employee before submitting attendance.');
      return;
    }

    if (!manualDraft.photoUri) {
      setLastError('Capture a proof photo before submitting attendance.');
      return;
    }

    const employee = employeesWithAttendance.find(
      entry => entry.id === manualDraft.selectedEmployeeId,
    );

    if (!employee) {
      setLastError('Selected employee was not found locally.');
      return;
    }

    const pendingRecord = buildPendingAttendance({
      deviceId: DEVICE_ID,
      employee,
      method: 'MANUAL',
      photoUri: manualDraft.photoUri,
      type: manualDraft.type,
    });

    startTransition(() => {
      setActivePanel('none');
      resetManualDraft(manualDraft.type);
    });
    setLastError(undefined);

    await saveAttendanceRecord(pendingRecord, employee.name);
  }

  async function submitEmployeeDraft() {
    console.log('[submitEmployeeDraft] triggered in mode:', employeeEditorMode);

    const requiresPhoto =
      employeeEditorMode === 'create' || !employeeDraft.faceEmbedding?.length;

    console.log('[submitEmployeeDraft] draft state:', JSON.stringify(employeeDraft, null, 2));
    console.log('[submitEmployeeDraft] requiresPhoto:', requiresPhoto);

    if (!employeeDraft.name || !employeeDraft.employeeId || !employeeDraft.team) {
      console.log('[submitEmployeeDraft] validation failed: missing text fields');
      setLastError('Name, employee ID, and team are required.');
      return;
    }

    if (requiresPhoto && !employeeDraft.photoUri && !employeeDraft.faceImageUrl) {
      console.log('[submitEmployeeDraft] validation failed: photo missing');
      setLastError('Capture an enrollment photo before saving the employee.');
      return;
    }

    if (!employeeDraft.faceEmbedding?.length) {
      console.log('[submitEmployeeDraft] validation failed: missing embedding');
      setLastError('Enrollment embedding is missing. Capture the face photo again.');
      return;
    }

    try {
      setSyncing(true);
      console.log('[submitEmployeeDraft] making API request... baseUrl:', apiBaseUrl);

      const saved =
        employeeEditorMode === 'edit'
          ? await updateEmployee(apiBaseUrl, employeeDraft)
          : await createEmployee(apiBaseUrl, employeeDraft);

      console.log('[submitEmployeeDraft] API returned:', saved);

      startTransition(() => {
        const nextEmployees = sortEmployees(
          employeeEditorMode === 'edit'
            ? employees.map(employee =>
              employee.id === saved.id ? saved : employee,
            )
            : [...employees, saved],
        );

        console.log('[submitEmployeeDraft] updating state with employees count:', nextEmployees.length);
        setEmployees(nextEmployees);
        setSelectedEmployeeId(saved.id);
        setEmployeeEditorMode('view');
        resetEmployeeDraft();
        setLastEmployeesSyncAt(new Date().toISOString());
      });

      setLastError(undefined);
    } catch (error) {
      console.error('[submitEmployeeDraft] API error:', error);
      setLastError(`Employee save failed: ${getErrorMessage(error)}`);
    } finally {
      setSyncing(false);
    }
  }

  function saveApiSettings() {
    const nextBaseUrl = apiUrlDraft.trim();

    if (!nextBaseUrl) {
      setLastError('API base URL cannot be empty.');
      return;
    }

    setApiBaseUrl(nextBaseUrl);
    setLastError(undefined);
  }

  return {
    activePanel,
    apiSettings: {
      baseUrl: apiBaseUrl,
      draftBaseUrl: apiUrlDraft,
    } satisfies ApiSettings,
    appMode,
    directoryEmployees,
    employeeDraft,
    employeeEditorMode,
    employeeQuery,
    employees: employeesWithAttendance,
    filteredEmployees,
    initialized,
    lastError,
    manualDraft,
    matchedEmployee,
    pendingAttendance,
    recentAttendance: addEmployeeNames(recentAttendance, employeesWithAttendance),
    recognitionStatus,
    selectedEmployee,
    selectedEmployeeId,
    setActivePanel,
    setApiUrlDraft,
    setAppMode,
    setEmployeeDraft,
    setEmployeeQuery,
    setLastError,
    setManualDraft,
    beginCreateEmployee,
    beginEditEmployee,
    cancelEmployeeEditor,
    applyEmployeePhoto,
    applyManualPhoto,
    handleFacesDetected,
    saveApiSettings,
    selectEmployee,
    submitEmployeeDraft,
    submitManualAttendance,
    syncEverything,
    syncState: {
      employeeCount: employeesWithAttendance.length,
      lastAttendanceSyncAt,
      lastEmployeesSyncAt,
      lastError,
      pendingUploads: pendingAttendance.length,
      syncing,
    } satisfies SyncState,
  };
}

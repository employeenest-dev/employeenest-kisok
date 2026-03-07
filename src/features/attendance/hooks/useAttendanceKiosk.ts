import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import {
  ANDROID_EMULATOR_API_BASE_URL,
  ANDROID_USB_API_BASE_URL,
  API_RUNTIME_OPTIONS,
  DEFAULT_API_BASE_URL,
  DEVICE_ID,
  getApiBaseUrlForRuntimePreset,
  inferApiRuntimePreset,
  IOS_SIMULATOR_API_BASE_URL,
  PHYSICAL_DEVICE_API_BASE_URL,
  RECOGNITION_THRESHOLDS,
} from '../../../config/mvp';
import {
  createAttendance,
  createEmployee,
  fetchAttendance,
  fetchEmployees,
  fetchHealth,
  updateEmployee,
} from '../api/client';
import { detectFacesInImage, DetectedFace } from '../native/camera';
import { buildFaceEmbedding } from '../services/faceEmbedding';
import { readStoredJson, readStoredString, writeStoredJson, writeStoredString } from '../services/localStore';
import { buildPendingAttendance, filterEmployees, sortEmployees, applyLastAttendanceTypes } from '../services/queue';
import { evaluateRecognition } from '../services/recognition';
import {
  ActivePanel,
  ApiSettings,
  ApiRuntimePreset,
  AppMode,
  AttendanceRecord,
  BackendPingState,
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

const LEGACY_MOCK_EMPLOYEE_IDS = new Set(['emp_001', 'emp_002', 'emp_003']);
const API_RESOLUTION_CACHE_TTL_MS = 30_000;
const API_RESOLUTION_TIMEOUT_MS = 2_500;

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

function isNetworkFailureMessage(message: string): boolean {
  return /failed to fetch|load failed|network request failed|network error/i.test(message);
}

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}

function getNetworkHint(baseUrl: string): string | undefined {
  try {
    const url = new URL(normalizeApiBaseUrl(baseUrl));
    const isLocalHost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1';

    if (Platform.OS === 'android') {
      if (url.hostname === '10.0.2.2') {
        return 'For a physical Android device, use your computer LAN IP, for example http://192.168.1.20:4000.';
      }

      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        return 'Use this only on an Android phone connected by USB. First run adb reverse tcp:4000 tcp:4000.';
      }

      if (isLocalHost) {
        return 'Use http://10.0.2.2:4000 on the Android emulator, or your computer LAN IP on a physical Android device.';
      }

      if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(url.hostname)) {
        return 'If your phone cannot reach your computer over Wi-Fi, connect it by USB, run adb reverse tcp:4000 tcp:4000, then select the Android USB runtime preset.';
      }
    }

    if (Platform.OS === 'ios' && url.hostname === '10.0.2.2') {
      return 'Use http://localhost:4000 on the iOS simulator, or your computer LAN IP on a physical iPhone or iPad.';
    }

    if (isLocalHost) {
      return 'If this app is running on a physical device, replace localhost with your computer LAN IP.';
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function formatApiError(prefix: string, error: unknown, baseUrl: string): string {
  const message = getErrorMessage(error);

  if (!isNetworkFailureMessage(message)) {
    return `${prefix}: ${message}`;
  }

  const target = normalizeApiBaseUrl(baseUrl);
  const hint = getNetworkHint(baseUrl);
  return `${prefix}: Could not reach ${target || 'the backend URL'}.${hint ? ` ${hint}` : ''}`;
}

function buildApiBaseUrlCandidates(preferredBaseUrl: string): string[] {
  const normalized = normalizeApiBaseUrl(preferredBaseUrl);
  const candidates = [normalized];

  if (Platform.OS === 'android') {
    candidates.push(ANDROID_USB_API_BASE_URL);
    candidates.push(ANDROID_EMULATOR_API_BASE_URL);

    if (PHYSICAL_DEVICE_API_BASE_URL) {
      candidates.push(PHYSICAL_DEVICE_API_BASE_URL);
    }
  }

  if (Platform.OS === 'ios') {
    candidates.push(IOS_SIMULATOR_API_BASE_URL);

    if (PHYSICAL_DEVICE_API_BASE_URL) {
      candidates.push(PHYSICAL_DEVICE_API_BASE_URL);
    }
  }

  return [...new Set(candidates.filter(Boolean))];
}

function stripLegacyMockEmployees(employees: Employee[]): Employee[] {
  return employees.filter(employee => !LEGACY_MOCK_EMPLOYEE_IDS.has(employee.id));
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
  const [apiRuntimePreset, setApiRuntimePreset] = useState<ApiRuntimePreset>(
    inferApiRuntimePreset(DEFAULT_API_BASE_URL),
  );
  const [appMode, setAppMode] = useState<AppMode>('admin');
  const [backendPingState, setBackendPingState] = useState<BackendPingState>({
    status: 'idle',
    testing: false,
  });
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
  const apiResolutionRef = useRef<{
    requestedBaseUrl: string;
    resolvedAt: number;
    resolvedBaseUrl: string;
  } | null>(null);
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
    const storedEmployees = stripLegacyMockEmployees(
      readStoredJson<Employee[]>(STORAGE_KEYS.employees, []),
    );
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
    setApiRuntimePreset(inferApiRuntimePreset(storedApiUrl));
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

  async function syncEmployees(baseUrl = apiBaseUrl) {
    const remoteEmployees = await fetchEmployees(baseUrl);
    const syncedAt = new Date().toISOString();
    const nextEmployees = sortEmployees(stripLegacyMockEmployees(remoteEmployees));

    startTransition(() => {
      setEmployees(nextEmployees);
      setLastEmployeesSyncAt(syncedAt);
      setSelectedEmployeeId(previous => previous ?? nextEmployees[0]?.id);
    });

    return nextEmployees;
  }

  async function syncAttendanceRecords(sourceEmployees = employees, baseUrl = apiBaseUrl) {
    const remoteAttendance = await fetchAttendance(baseUrl);
    const syncedAt = new Date().toISOString();

    startTransition(() => {
      setRecentAttendance(addEmployeeNames(remoteAttendance, sourceEmployees));
      setLastAttendanceSyncAt(syncedAt);
    });
  }

  async function flushPendingAttendance(baseUrl = apiBaseUrl) {
    if (pendingAttendance.length === 0) {
      return;
    }

    let remaining = [...pendingAttendance];

    for (const record of pendingAttendance) {
      await createAttendance(baseUrl, record);
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
      const reachableApiBaseUrl = await ensureReachableApiBaseUrl(apiBaseUrl, {
        quiet: true,
      });
      const syncedEmployees = await syncEmployees(reachableApiBaseUrl);
      await flushPendingAttendance(reachableApiBaseUrl);
      await syncAttendanceRecords(syncedEmployees, reachableApiBaseUrl);
      setLastError(undefined);
    } catch (error) {
      setLastError(formatApiError('Sync failed', error, apiBaseUrl));
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
      setLastError(formatApiError('Sync failed', error, apiBaseUrl));
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

  function applyApiBaseUrl(nextBaseUrl: string, options?: { updateDraft?: boolean }) {
    setApiBaseUrl(nextBaseUrl);
    setApiRuntimePreset(inferApiRuntimePreset(nextBaseUrl));

    if (options?.updateDraft !== false) {
      setApiUrlDraft(nextBaseUrl);
    }
  }

  async function resolveReachableApiBaseUrl(
    preferredBaseUrl: string,
    timeoutMs = API_RESOLUTION_TIMEOUT_MS,
  ): Promise<{
    baseUrl: string;
    health: Awaited<ReturnType<typeof fetchHealth>>;
    switched: boolean;
  }> {
    const normalized = normalizeApiBaseUrl(preferredBaseUrl);

    if (!normalized) {
      throw new Error('API base URL cannot be empty.');
    }

    const candidates = buildApiBaseUrlCandidates(normalized);
    let lastResolutionError: unknown = new Error('No backend URL candidates were generated.');

    for (const candidate of candidates) {
      try {
        const health = await fetchHealth(candidate, timeoutMs);
        return {
          baseUrl: candidate,
          health,
          switched: candidate !== normalized,
        };
      } catch (error) {
        lastResolutionError = error;
      }
    }

    throw lastResolutionError;
  }

  async function ensureReachableApiBaseUrl(
    preferredBaseUrl: string,
    options?: { quiet?: boolean; updateDraft?: boolean },
  ): Promise<string> {
    const normalized = normalizeApiBaseUrl(preferredBaseUrl);

    if (!normalized) {
      throw new Error('API base URL cannot be empty.');
    }

    const cachedResolution = apiResolutionRef.current;

    if (
      cachedResolution &&
      cachedResolution.requestedBaseUrl === normalized &&
      Date.now() - cachedResolution.resolvedAt < API_RESOLUTION_CACHE_TTL_MS
    ) {
      if (cachedResolution.resolvedBaseUrl !== apiBaseUrl) {
        applyApiBaseUrl(cachedResolution.resolvedBaseUrl, {
          updateDraft: options?.updateDraft,
        });
      }

      return cachedResolution.resolvedBaseUrl;
    }

    const resolution = await resolveReachableApiBaseUrl(normalized);

    apiResolutionRef.current = {
      requestedBaseUrl: normalized,
      resolvedAt: Date.now(),
      resolvedBaseUrl: resolution.baseUrl,
    };

    if (resolution.baseUrl !== apiBaseUrl || options?.updateDraft !== false) {
      applyApiBaseUrl(resolution.baseUrl, {
        updateDraft: options?.updateDraft,
      });
    }

    if (resolution.switched && !options?.quiet) {
      setBackendPingState({
        message: `Requested URL was unreachable. Using ${resolution.baseUrl} instead.`,
        status: 'success',
        testing: false,
      });
    }

    return resolution.baseUrl;
  }

  function updateApiUrlDraft(value: string) {
    setApiUrlDraft(value);
    setApiRuntimePreset(inferApiRuntimePreset(value));
    apiResolutionRef.current = null;
    setBackendPingState({
      status: 'idle',
      testing: false,
    });
  }

  function selectApiRuntimePreset(preset: ApiRuntimePreset) {
    setApiRuntimePreset(preset);
    apiResolutionRef.current = null;
    setBackendPingState({
      status: 'idle',
      testing: false,
    });

    const presetUrl = getApiBaseUrlForRuntimePreset(preset);

    if (presetUrl) {
      setApiUrlDraft(presetUrl);
    }
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

  async function pingBackend() {
    const targetUrl = normalizeApiBaseUrl(apiUrlDraft);

    if (!targetUrl) {
      setBackendPingState({
        message: 'Enter an API base URL before testing the backend.',
        status: 'error',
        testing: false,
      });
      return;
    }

    setBackendPingState({
      message: `Testing ${targetUrl}...`,
      status: 'idle',
      testing: true,
    });

    try {
      const resolution = await resolveReachableApiBaseUrl(targetUrl);

      apiResolutionRef.current = {
        requestedBaseUrl: targetUrl,
        resolvedAt: Date.now(),
        resolvedBaseUrl: resolution.baseUrl,
      };

      if (resolution.switched) {
        applyApiBaseUrl(resolution.baseUrl);
      }

      setBackendPingState({
        message: resolution.switched
          ? `Requested URL was unreachable. Connected to the backend at ${resolution.baseUrl} · status ${resolution.health.status} · db ${resolution.health.databaseMode} · storage ${resolution.health.storageMode}`
          : `Backend reachable at ${resolution.baseUrl} · status ${resolution.health.status} · db ${resolution.health.databaseMode} · storage ${resolution.health.storageMode}`,
        status: 'success',
        testing: false,
      });
    } catch (error) {
      setBackendPingState({
        message: formatApiError('Backend ping failed', error, targetUrl),
        status: 'error',
        testing: false,
      });
    }
  }

  async function saveAttendanceRecord(
    record: PendingAttendanceRecord,
    employeeName: string,
  ) {
    startTransition(() => {
      setPendingAttendance(previous => [record, ...previous]);
    });

    try {
      const reachableApiBaseUrl = await ensureReachableApiBaseUrl(apiBaseUrl, {
        quiet: true,
      });
      const saved = await createAttendance(reachableApiBaseUrl, record);

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
      setLastError(formatApiError('Attendance queued offline', error, apiBaseUrl));
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
          setLastError(formatApiError('Automatic attendance failed', error, apiBaseUrl));
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
      const reachableApiBaseUrl = await ensureReachableApiBaseUrl(apiBaseUrl, {
        quiet: true,
      });
      console.log('[submitEmployeeDraft] making API request... baseUrl:', reachableApiBaseUrl);

      const saved =
        employeeEditorMode === 'edit'
          ? await updateEmployee(reachableApiBaseUrl, employeeDraft)
          : await createEmployee(reachableApiBaseUrl, employeeDraft);

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
      setLastError(formatApiError('Employee save failed', error, apiBaseUrl));
    } finally {
      setSyncing(false);
    }
  }

  async function saveApiSettings() {
    const nextBaseUrl = normalizeApiBaseUrl(apiUrlDraft);

    if (!nextBaseUrl) {
      setLastError('API base URL cannot be empty.');
      return;
    }

    setBackendPingState({
      message: `Connecting to ${nextBaseUrl}...`,
      status: 'idle',
      testing: true,
    });

    try {
      const resolution = await resolveReachableApiBaseUrl(nextBaseUrl);
      apiResolutionRef.current = {
        requestedBaseUrl: nextBaseUrl,
        resolvedAt: Date.now(),
        resolvedBaseUrl: resolution.baseUrl,
      };
      applyApiBaseUrl(resolution.baseUrl);
      setBackendPingState({
        message: resolution.switched
          ? `Requested URL was unreachable. Saved ${resolution.baseUrl} as the working backend.`
          : `Saved ${resolution.baseUrl} as the backend.`,
        status: 'success',
        testing: false,
      });
      setLastError(undefined);
    } catch (error) {
      setBackendPingState({
        message: formatApiError('Backend save failed', error, nextBaseUrl),
        status: 'error',
        testing: false,
      });
      setLastError(formatApiError('Backend save failed', error, nextBaseUrl));
    }
  }

  return {
    activePanel,
    apiSettings: {
      baseUrl: apiBaseUrl,
      draftBaseUrl: apiUrlDraft,
      runtimeOptions: API_RUNTIME_OPTIONS,
      runtimePreset: apiRuntimePreset,
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
    backendPingState,
    manualDraft,
    matchedEmployee,
    pendingAttendance,
    recentAttendance: addEmployeeNames(recentAttendance, employeesWithAttendance),
    recognitionStatus,
    selectedEmployee,
    selectedEmployeeId,
    setActivePanel,
    setApiUrlDraft: updateApiUrlDraft,
    setAppMode,
    setEmployeeDraft,
    setEmployeeQuery,
    setLastError,
    setManualDraft,
    beginCreateEmployee,
    beginEditEmployee,
    cancelEmployeeEditor,
    pingBackend,
    applyEmployeePhoto,
    applyManualPhoto,
    handleFacesDetected,
    saveApiSettings,
    selectApiRuntimePreset,
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

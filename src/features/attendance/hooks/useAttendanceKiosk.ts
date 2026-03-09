import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  APP_NAME,
  DEVICE_ID,
  RECOGNITION_THRESHOLDS,
} from '../../../config/mvp';
import {
  createId,
} from '../services/id';
import { detectFacesInImage, DetectedFace } from '../native/camera';
import { buildFaceEmbedding } from '../services/faceEmbedding';
import { readStoredJson, writeStoredJson } from '../services/localStore';
import { buildAttendanceRecord, filterEmployees, sortEmployees, applyLastAttendanceTypes } from '../services/queue';
import { evaluateRecognition } from '../services/recognition';
import {
  ActivePanel,
  AppMode,
  AttendanceRecord,
  Employee,
  EmployeeEditorMode,
  ManualDraft,
  OnboardingDraft,
  RecognitionStatus,
} from '../types';
import { getNextAttendanceType } from '../services/attendance';

const STORAGE_KEYS = {
  employees: 'attendance.employees',
  recentAttendance: 'attendance.recent-attendance',
} as const;

const LEGACY_MOCK_EMPLOYEE_IDS = new Set(['emp_001', 'emp_002', 'emp_003']);

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
  const [appMode, setAppMode] = useState<AppMode>('admin');
  const [employeeEditorMode, setEmployeeEditorMode] =
    useState<EmployeeEditorMode>('view');
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeDraft, setEmployeeDraft] =
    useState<OnboardingDraft>(EMPTY_EMPLOYEE_DRAFT);
  const [initialized, setInitialized] = useState(false);
  const [lastError, setLastError] = useState<string | undefined>();
  const [manualDraft, setManualDraft] = useState<ManualDraft>(EMPTY_MANUAL_DRAFT);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>(
    evaluateRecognition({
      employees: [],
      faceCount: 0,
      thresholds: RECOGNITION_THRESHOLDS,
    }),
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();

  const autoAttendanceRef = useRef<{ employeeId: string; timestamp: number } | null>(null);
  const deferredDirectoryQuery = useDeferredValue(employeeQuery);
  const deferredManualQuery = useDeferredValue(manualDraft.employeeQuery);
  const employeesWithAttendance = applyLastAttendanceTypes(
    employees,
    recentAttendance,
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
    const storedRecent = readStoredJson<AttendanceRecord[]>(STORAGE_KEYS.recentAttendance, []);

    const nextEmployees = sortEmployees(storedEmployees);

    setEmployees(nextEmployees);
    setRecentAttendance(storedRecent);
    setSelectedEmployeeId(nextEmployees[0]?.id);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    writeStoredJson(STORAGE_KEYS.employees, employees);
    writeStoredJson(STORAGE_KEYS.recentAttendance, recentAttendance);
  }, [
    employees,
    initialized,
    recentAttendance,
  ]);

  useEffect(() => {
    if (!selectedEmployeeId && employeesWithAttendance.length > 0) {
      setSelectedEmployeeId(employeesWithAttendance[0].id);
    }
  }, [employeesWithAttendance, selectedEmployeeId]);

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

  function saveAttendanceRecord(
    record: AttendanceRecord,
  ) {
    startTransition(() => {
      setRecentAttendance(previous => [record, ...previous]);
    });
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

    const record = buildAttendanceRecord({
      confidence,
      deviceId: DEVICE_ID,
      employee,
      method: 'FACE',
      type: getNextAttendanceType(employee.lastAttendanceType),
    });

    saveAttendanceRecord(record);
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

    const record = buildAttendanceRecord({
      deviceId: DEVICE_ID,
      employee,
      method: 'MANUAL',
      photoUrl: manualDraft.photoUri,
      type: manualDraft.type,
    });

    startTransition(() => {
      setActivePanel('none');
      resetManualDraft(manualDraft.type);
    });
    setLastError(undefined);

    saveAttendanceRecord(record);
  }

  async function submitEmployeeDraft() {
    const requiresPhoto =
      employeeEditorMode === 'create' || !employeeDraft.faceEmbedding?.length;

    if (!employeeDraft.name || !employeeDraft.employeeId || !employeeDraft.team) {
      setLastError('Name, employee ID, and team are required.');
      return;
    }

    if (requiresPhoto && !employeeDraft.photoUri && !employeeDraft.faceImageUrl) {
      setLastError('Capture an enrollment photo before saving the employee.');
      return;
    }

    if (!employeeDraft.faceEmbedding?.length) {
      setLastError('Enrollment embedding is missing. Capture the face photo again.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const saved: Employee = {
        id: employeeDraft.id || createId('employee'),
        employeeId: employeeDraft.employeeId,
        name: employeeDraft.name,
        team: employeeDraft.team,
        faceEmbedding: employeeDraft.faceEmbedding,
        embeddingVersion: employeeDraft.embeddingVersion ?? 1,
        faceImageUrl: employeeDraft.photoUri || employeeDraft.faceImageUrl,
        createdAt: employeeDraft.id ? (employees.find(e => e.id === employeeDraft.id)?.createdAt || now) : now,
        updatedAt: now,
      };

      startTransition(() => {
        const nextEmployees = sortEmployees(
          employeeEditorMode === 'edit'
            ? employees.map(employee =>
              employee.id === saved.id ? saved : employee,
            )
            : [...employees, saved],
        );

        setEmployees(nextEmployees);
        setSelectedEmployeeId(saved.id);
        setEmployeeEditorMode('view');
        resetEmployeeDraft();
      });

      setLastError(undefined);
    } catch (error) {
      setLastError(`Employee save failed: ${getErrorMessage(error)}`);
    }
  }

  function clearAllData() {
    startTransition(() => {
      setEmployees([]);
      setRecentAttendance([]);
      setSelectedEmployeeId(undefined);
      setLastError(undefined);
    });
  }

  return {
    activePanel,
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
    recentAttendance: addEmployeeNames(recentAttendance, employeesWithAttendance),
    recognitionStatus,
    selectedEmployee,
    selectedEmployeeId,
    setActivePanel,
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
    selectEmployee,
    submitEmployeeDraft,
    submitManualAttendance,
    clearAllData,
  };
}

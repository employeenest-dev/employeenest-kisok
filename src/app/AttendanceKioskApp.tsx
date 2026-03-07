import React from 'react';
import { useRef } from 'react';

import {
  normalizePhotoUri,
} from '../features/attendance/services/attendance';
import { KioskCameraHandle } from '../features/attendance/components/KioskCamera';
import { useAttendanceKiosk } from '../features/attendance/hooks/useAttendanceKiosk';
import { AdminScreen } from '../features/attendance/screens/AdminScreen';
import { KioskScreen } from '../features/attendance/screens/KioskScreen';

export function AttendanceKioskApp() {
  const cameraRef = useRef<KioskCameraHandle>(null);
  const kiosk = useAttendanceKiosk();

  async function capturePhoto(target: 'manual' | 'employee') {
    const path = await cameraRef.current?.takePhoto();

    if (!path) {
      kiosk.setLastError('Camera capture failed. Confirm camera permission and device availability.');
      return;
    }

    const uri = normalizePhotoUri(path);

    if (target === 'manual') {
      kiosk.applyManualPhoto(uri);
    } else {
      await kiosk.applyEmployeePhoto(uri);
    }
  }

  if (kiosk.appMode === 'admin') {
    return (
      <AdminScreen
        apiSettings={kiosk.apiSettings}
        appMode={kiosk.appMode}
        backendPingState={kiosk.backendPingState}
        cameraRef={cameraRef}
        directoryEmployees={kiosk.directoryEmployees}
        employeeDraft={kiosk.employeeDraft}
        employeeEditorMode={kiosk.employeeEditorMode}
        employeeQuery={kiosk.employeeQuery}
        initialized={kiosk.initialized}
        lastError={kiosk.lastError}
        onBeginCreateEmployee={kiosk.beginCreateEmployee}
        onBeginEditEmployee={kiosk.beginEditEmployee}
        onCancelEmployeeEditor={kiosk.cancelEmployeeEditor}
        onCaptureEmployeePhoto={() => capturePhoto('employee')}
        onEmployeeDraftChange={kiosk.setEmployeeDraft}
        onEmployeeQueryChange={kiosk.setEmployeeQuery}
        onPingBackend={kiosk.pingBackend}
        onSaveApiSettings={kiosk.saveApiSettings}
        onSaveEmployee={kiosk.submitEmployeeDraft}
        onSelectApiRuntimePreset={kiosk.selectApiRuntimePreset}
        onSelectEmployee={kiosk.selectEmployee}
        onSetApiUrlDraft={kiosk.setApiUrlDraft}
        onSwitchMode={kiosk.setAppMode}
        onSyncNow={kiosk.syncEverything}
        recentAttendance={kiosk.recentAttendance}
        selectedEmployee={kiosk.selectedEmployee}
        selectedEmployeeId={kiosk.selectedEmployeeId}
        syncState={kiosk.syncState}
      />
    );
  }

  return (
    <KioskScreen
      activePanel={kiosk.activePanel}
      apiSettings={kiosk.apiSettings}
      appMode={kiosk.appMode}
      backendPingState={kiosk.backendPingState}
      cameraRef={cameraRef}
      filteredEmployees={kiosk.filteredEmployees}
      initialized={kiosk.initialized}
      lastError={kiosk.lastError}
      manualDraft={kiosk.manualDraft}
      matchedEmployee={kiosk.matchedEmployee}
      onCaptureManualPhoto={() => capturePhoto('manual')}
      onClosePanel={() => kiosk.setActivePanel('none')}
      onFacesDetected={kiosk.handleFacesDetected}
      onManualDraftChange={kiosk.setManualDraft}
      onOpenPanel={kiosk.setActivePanel}
      onPingBackend={kiosk.pingBackend}
      onSaveApiSettings={kiosk.saveApiSettings}
      onSaveManualAttendance={kiosk.submitManualAttendance}
      onSelectApiRuntimePreset={kiosk.selectApiRuntimePreset}
      onSetApiUrlDraft={kiosk.setApiUrlDraft}
      onSwitchMode={kiosk.setAppMode}
      onSyncNow={kiosk.syncEverything}
      pendingAttendance={kiosk.pendingAttendance}
      recentAttendance={kiosk.recentAttendance}
      recognitionStatus={kiosk.recognitionStatus}
      syncState={kiosk.syncState}
    />
  );
}

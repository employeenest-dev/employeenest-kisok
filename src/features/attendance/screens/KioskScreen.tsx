import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME, DEVICE_ID, OFFICE_NAME } from '../../../config/mvp';
import { ApiSettingsPanel } from '../components/ApiSettingsPanel';
import { KioskCamera, KioskCameraHandle } from '../components/KioskCamera';
import { ModeSwitch } from '../components/ModeSwitch';
import {
  buildSyncLabel,
  describeAttendance,
  formatTimestamp,
  resolveAssetUrl,
} from '../services/attendance';
import {
  ActivePanel,
  ApiSettings,
  ApiRuntimePreset,
  AppMode,
  AttendanceRecord,
  BackendPingState,
  Employee,
  ManualDraft,
  PendingAttendanceRecord,
  RecognitionStatus,
  SyncState,
} from '../types';

interface KioskScreenProps {
  activePanel: ActivePanel;
  apiSettings: ApiSettings;
  appMode: AppMode;
  backendPingState: BackendPingState;
  cameraRef: React.RefObject<KioskCameraHandle | null>;
  filteredEmployees: Employee[];
  initialized: boolean;
  lastError?: string;
  manualDraft: ManualDraft;
  matchedEmployee?: Employee;
  onCaptureManualPhoto: () => Promise<void>;
  onClosePanel: () => void;
  onFacesDetected: (faces: import('../native/camera').DetectedFace[]) => void;
  onManualDraftChange: (draft: ManualDraft) => void;
  onOpenPanel: (panel: Exclude<ActivePanel, 'none'>) => void;
  onPingBackend: () => Promise<void>;
  onSaveApiSettings: () => void;
  onSaveManualAttendance: () => Promise<void>;
  onSelectApiRuntimePreset: (preset: ApiRuntimePreset) => void;
  onSetApiUrlDraft: (value: string) => void;
  onSwitchMode: (mode: AppMode) => void;
  onSyncNow: () => Promise<void>;
  pendingAttendance: PendingAttendanceRecord[];
  recentAttendance: AttendanceRecord[];
  recognitionStatus: RecognitionStatus;
  syncState: SyncState;
}

function ActionButton(props: {
  kind?: 'primary' | 'secondary';
  label: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.actionButton,
        props.kind === 'secondary' && styles.actionButtonSecondary,
        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
      ]}>
      <Text
        style={[
          styles.actionButtonText,
          props.kind === 'secondary' ? styles.actionButtonTextSecondary : null,
        ]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

function ProfileImage(props: { apiBaseUrl: string; label: string; uri?: string }) {
  if (!props.uri) {
    return (
      <View style={styles.profilePlaceholder}>
        <Text style={styles.profilePlaceholderText}>{props.label.slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolveAssetUrl(props.uri, props.apiBaseUrl) }}
      style={styles.profileImage}
    />
  );
}

export function KioskScreen(props: KioskScreenProps) {
  if (!props.initialized) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingTitle}>{APP_NAME}</Text>
          <Text style={styles.loadingCopy}>Loading kiosk data and camera state.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{APP_NAME}</Text>
            <Text style={styles.title}>Kiosk mode for automatic recognition</Text>
            <Text style={styles.subtitle}>
              Employees enrolled in Admin mode can be recognized here
              automatically. If confidence is too low, fall back to manual attendance.
            </Text>
          </View>
          <View style={styles.headerControls}>
            <ModeSwitch mode={props.appMode} onChange={props.onSwitchMode} />
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeLabel}>Device</Text>
              <Text style={styles.headerBadgeValue}>{DEVICE_ID}</Text>
            </View>
          </View>
        </View>

        {props.lastError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{props.lastError}</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.cameraColumn}>
            <KioskCamera ref={props.cameraRef} isActive onFacesDetected={props.onFacesDetected} />
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.heroLabel}>{OFFICE_NAME}</Text>
            <Text style={styles.heroTitle}>Live recognition gate</Text>
            <Text style={styles.heroDescription}>{props.recognitionStatus.message}</Text>

            <View style={styles.outcomePill}>
              <Text style={styles.outcomePillText}>
                Faces: {props.recognitionStatus.faceCount} · Route: {props.recognitionStatus.outcome}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <ActionButton label="Manual fallback" onPress={() => props.onOpenPanel('manual')} />
              <ActionButton kind="secondary" label="Sync now" onPress={props.onSyncNow} />
              <ActionButton
                kind="secondary"
                label="Settings"
                onPress={() => props.onOpenPanel('settings')}
              />
              <ActionButton
                kind="secondary"
                label="Edit employees"
                onPress={() => props.onSwitchMode('admin')}
              />
            </View>
          </View>
        </View>

        {props.matchedEmployee ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Current automatic match</Text>
            <View style={styles.matchCard}>
              <ProfileImage
                apiBaseUrl={props.apiSettings.baseUrl}
                label={props.matchedEmployee.name}
                uri={props.matchedEmployee.faceImageUrl}
              />
              <View style={styles.matchBody}>
                <Text style={styles.matchName}>{props.matchedEmployee.name}</Text>
                <Text style={styles.matchMeta}>
                  {props.matchedEmployee.employeeId} · {props.matchedEmployee.team}
                </Text>
                <Text style={styles.matchMeta}>
                  Confidence {props.recognitionStatus.confidence?.toFixed(2) ?? '0.00'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Cached employees</Text>
            <Text style={styles.metricValue}>{props.syncState.employeeCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pending queue</Text>
            <Text style={styles.metricValue}>{props.syncState.pendingUploads}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Last sync</Text>
            <Text style={styles.metricValue}>{buildSyncLabel(props.syncState)}</Text>
          </View>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Recent attendance</Text>
            {props.recentAttendance.length === 0 ? (
              <Text style={styles.emptyState}>No attendance has synced yet.</Text>
            ) : (
              props.recentAttendance.slice(0, 6).map(record => (
                <View key={record.id} style={styles.listItem}>
                  <View>
                    <Text style={styles.listTitle}>{record.employeeName ?? record.employeeId}</Text>
                    <Text style={styles.listCopy}>{describeAttendance(record)}</Text>
                  </View>
                  <Text style={styles.listMeta}>{formatTimestamp(record.timestamp)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Pending queue</Text>
            {props.pendingAttendance.length === 0 ? (
              <Text style={styles.emptyState}>No offline attendance is waiting to sync.</Text>
            ) : (
              props.pendingAttendance.slice(0, 6).map(record => (
                <View key={record.localId} style={styles.listItem}>
                  <View>
                    <Text style={styles.listTitle}>{record.employeeName}</Text>
                    <Text style={styles.listCopy}>{record.type} via {record.method}</Text>
                  </View>
                  <Text style={styles.listMeta}>{formatTimestamp(record.timestamp)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {props.activePanel === 'manual' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Manual backup flow</Text>
            <Text style={styles.emptyState}>
              Search the employee, capture a proof photo, and queue attendance when automatic recognition is not trustworthy.
            </Text>

            <TextInput
              onChangeText={value => {
                props.onManualDraftChange({
                  ...props.manualDraft,
                  employeeQuery: value,
                });
              }}
              placeholder="Search name, employee ID, or team"
              placeholderTextColor="#6f8f95"
              style={styles.input}
              value={props.manualDraft.employeeQuery}
            />

            <View style={styles.selectionRow}>
              {(['CHECKIN', 'CHECKOUT'] as const).map(type => (
                <Pressable
                  key={type}
                  onPress={() => {
                    props.onManualDraftChange({
                      ...props.manualDraft,
                      type,
                    });
                  }}
                  style={({ pressed }) => [
                    styles.toggleButton,
                    props.manualDraft.type === type && styles.toggleButtonActive,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Text
                    style={[
                      styles.toggleText,
                      props.manualDraft.type === type ? styles.toggleTextActive : null,
                    ]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.selectionList}>
              {props.filteredEmployees.slice(0, 8).map(employee => (
                <Pressable
                  key={employee.id}
                  onPress={() => {
                    props.onManualDraftChange({
                      ...props.manualDraft,
                      selectedEmployeeId: employee.id,
                    });
                  }}
                  style={({ pressed }) => [
                    styles.employeeOption,
                    props.manualDraft.selectedEmployeeId === employee.id && styles.employeeOptionSelected,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Text style={styles.employeeOptionTitle}>{employee.name}</Text>
                  <Text style={styles.employeeOptionCopy}>
                    {employee.employeeId} · {employee.team}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.actionRow}>
              <ActionButton
                kind="secondary"
                label={props.manualDraft.photoUri ? 'Retake proof photo' : 'Capture proof photo'}
                onPress={props.onCaptureManualPhoto}
              />
              <ActionButton label="Save attendance" onPress={props.onSaveManualAttendance} />
              <ActionButton kind="secondary" label="Close" onPress={props.onClosePanel} />
            </View>
          </View>
        ) : null}

        {props.activePanel === 'settings' ? (
          <ApiSettingsPanel
            apiSettings={props.apiSettings}
            backendPingState={props.backendPingState}
            onClose={props.onClosePanel}
            onPingBackend={props.onPingBackend}
            onSaveApiSettings={props.onSaveApiSettings}
            onSelectApiRuntimePreset={props.onSelectApiRuntimePreset}
            onSetApiUrlDraft={props.onSetApiUrlDraft}
            title="Backend settings"
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 999,
    backgroundColor: '#7dd3c7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonSecondary: {
    backgroundColor: '#133947',
  },
  actionButtonText: {
    color: '#04131a',
    fontSize: 15,
    fontWeight: '800',
  },
  actionButtonTextSecondary: {
    color: '#d9ecef',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cameraColumn: {
    minHeight: 320,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 18,
  },
  employeeOption: {
    borderRadius: 18,
    backgroundColor: '#0a1f28',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  employeeOptionCopy: {
    color: '#aac7cc',
    fontSize: 14,
    marginTop: 4,
  },
  employeeOptionSelected: {
    backgroundColor: '#163847',
    borderWidth: 1,
    borderColor: '#7dd3c7',
  },
  employeeOptionTitle: {
    color: '#f2fbfa',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    color: '#8fb7be',
    fontSize: 15,
    lineHeight: 22,
  },
  errorBanner: {
    borderRadius: 20,
    backgroundColor: '#572727',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorBannerText: {
    color: '#ffd8d8',
    fontSize: 14,
    lineHeight: 20,
  },
  eyebrow: {
    color: '#7dd3c7',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'flex-start',
    gap: 12,
  },
  headerBadge: {
    borderRadius: 18,
    backgroundColor: '#0d2732',
    minWidth: 150,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerBadgeLabel: {
    color: '#8fb7be',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerBadgeValue: {
    color: '#f2fbfa',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  headerControls: {
    gap: 10,
    width: '100%',
  },
  headerCopy: {
    gap: 8,
  },
  heroBody: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: '#0a1f28',
    gap: 18,
    padding: 20,
  },
  heroDescription: {
    color: '#b8d2d5',
    fontSize: 16,
    lineHeight: 23,
  },
  heroLabel: {
    color: '#f7b267',
    fontSize: 15,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#f2fbfa',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  input: {
    borderRadius: 16,
    backgroundColor: '#0a1f28',
    color: '#f2fbfa',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listCopy: {
    color: '#aac7cc',
    fontSize: 14,
    marginTop: 4,
  },
  listItem: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a5563',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  listMeta: {
    color: '#8fb7be',
    fontSize: 13,
  },
  listTitle: {
    color: '#f2fbfa',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingCopy: {
    color: '#b8d2d5',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingTitle: {
    color: '#f2fbfa',
    fontSize: 28,
    fontWeight: '800',
  },
  matchBody: {
    flex: 1,
    gap: 4,
  },
  matchCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  matchMeta: {
    color: '#aac7cc',
    fontSize: 14,
    lineHeight: 20,
  },
  matchName: {
    color: '#f2fbfa',
    fontSize: 22,
    fontWeight: '800',
  },
  metricCard: {
    borderRadius: 20,
    backgroundColor: '#0d2732',
    flexGrow: 1,
    gap: 6,
    minWidth: 150,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricLabel: {
    color: '#8fb7be',
    fontSize: 13,
  },
  metricValue: {
    color: '#f2fbfa',
    fontSize: 22,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  outcomePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#163847',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outcomePillText: {
    color: '#7dd3c7',
    fontSize: 14,
    fontWeight: '700',
  },
  panel: {
    borderRadius: 24,
    backgroundColor: '#0d2732',
    gap: 14,
    padding: 18,
  },
  panelTitle: {
    color: '#f2fbfa',
    fontSize: 20,
    fontWeight: '800',
  },
  profileImage: {
    borderRadius: 24,
    height: 96,
    width: 96,
  },
  profilePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#163847',
    borderRadius: 24,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  profilePlaceholderText: {
    color: '#7dd3c7',
    fontSize: 26,
    fontWeight: '800',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#04131a',
  },
  selectionList: {
    gap: 8,
  },
  selectionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  subtitle: {
    color: '#b8d2d5',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 680,
  },
  title: {
    color: '#f2fbfa',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    maxWidth: 680,
  },
  toggleButton: {
    borderRadius: 999,
    backgroundColor: '#133947',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#7dd3c7',
  },
  toggleText: {
    color: '#d9ecef',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#04131a',
  },
  twoColumn: {
    gap: 12,
  },
});

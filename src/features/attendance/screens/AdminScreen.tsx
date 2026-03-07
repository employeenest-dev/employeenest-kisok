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

import { APP_NAME, DEVICE_ID } from '../../../config/mvp';
import { KioskCamera, KioskCameraHandle } from '../components/KioskCamera';
import { ModeSwitch } from '../components/ModeSwitch';
import { buildSyncLabel, formatTimestamp, resolveAssetUrl } from '../services/attendance';
import {
  ApiSettings,
  AppMode,
  AttendanceRecord,
  Employee,
  EmployeeEditorMode,
  OnboardingDraft,
  SyncState,
} from '../types';

interface AdminScreenProps {
  apiSettings: ApiSettings;
  appMode: AppMode;
  cameraRef: React.RefObject<KioskCameraHandle | null>;
  directoryEmployees: Employee[];
  employeeDraft: OnboardingDraft;
  employeeEditorMode: EmployeeEditorMode;
  initialized: boolean;
  lastError?: string;
  onBeginCreateEmployee: () => void;
  onBeginEditEmployee: (employee: Employee) => void;
  onCaptureEmployeePhoto: () => Promise<void>;
  onCancelEmployeeEditor: () => void;
  onEmployeeDraftChange: (draft: OnboardingDraft) => void;
  onEmployeeQueryChange: (value: string) => void;
  onSaveApiSettings: () => void;
  onSaveEmployee: () => Promise<void>;
  onSelectEmployee: (employeeId: string) => void;
  onSetApiUrlDraft: (value: string) => void;
  onSwitchMode: (mode: AppMode) => void;
  onSyncNow: () => Promise<void>;
  recentAttendance: AttendanceRecord[];
  selectedEmployee?: Employee;
  selectedEmployeeId?: string;
  syncState: SyncState;
  employeeQuery: string;
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

export function AdminScreen(props: AdminScreenProps) {
  if (!props.initialized) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingTitle}>{APP_NAME}</Text>
          <Text style={styles.loadingCopy}>Loading employees and cached device data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedAttendance = props.recentAttendance.filter(
    record => record.employeeId === props.selectedEmployee?.id,
  );
  const isEditing = props.employeeEditorMode === 'create' || props.employeeEditorMode === 'edit';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{APP_NAME}</Text>
            <Text style={styles.title}>Employee onboarding and profile management</Text>
            <Text style={styles.subtitle}>
              Open the app into employee setup first, capture enrollment photos,
              and then switch the tablet into kiosk mode for automatic recognition.
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

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Employees</Text>
            <Text style={styles.metricValue}>{props.syncState.employeeCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pending uploads</Text>
            <Text style={styles.metricValue}>{props.syncState.pendingUploads}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Last sync</Text>
            <Text style={styles.metricValue}>{buildSyncLabel(props.syncState)}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.actionRow}>
            <ActionButton label="Add employee" onPress={props.onBeginCreateEmployee} />
            <ActionButton kind="secondary" label="Sync now" onPress={props.onSyncNow} />
            <ActionButton
              kind="secondary"
              label="Open kiosk"
              onPress={() => props.onSwitchMode('kiosk')}
            />
          </View>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Employee directory</Text>
            <TextInput
              onChangeText={props.onEmployeeQueryChange}
              placeholder="Search employees"
              placeholderTextColor="#6f8f95"
              style={styles.input}
              value={props.employeeQuery}
            />

            <View style={styles.list}>
              {props.directoryEmployees.map(employee => (
                <Pressable
                  key={employee.id}
                  onPress={() => props.onSelectEmployee(employee.id)}
                  style={({ pressed }) => [
                    styles.listItem,
                    props.selectedEmployeeId === employee.id && styles.listItemActive,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <ProfileImage
                    apiBaseUrl={props.apiSettings.baseUrl}
                    label={employee.name}
                    uri={employee.faceImageUrl}
                  />
                  <View style={styles.listItemBody}>
                    <Text style={styles.listItemTitle}>{employee.name}</Text>
                    <Text style={styles.listItemMeta}>
                      {employee.employeeId} · {employee.team}
                    </Text>
                    <Text style={styles.listItemMeta}>
                      {employee.faceEmbedding.length > 0
                        ? 'Recognition ready'
                        : 'Needs enrollment'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.panel}>
            {isEditing ? (
              <>
                <Text style={styles.panelTitle}>
                  {props.employeeEditorMode === 'create'
                    ? 'New employee onboarding'
                    : 'Edit employee profile'}
                </Text>
                <TextInput
                  onChangeText={value => {
                    props.onEmployeeDraftChange({
                      ...props.employeeDraft,
                      name: value,
                    });
                  }}
                  placeholder="Employee name"
                  placeholderTextColor="#6f8f95"
                  style={styles.input}
                  value={props.employeeDraft.name}
                />
                <TextInput
                  autoCapitalize="characters"
                  onChangeText={value => {
                    props.onEmployeeDraftChange({
                      ...props.employeeDraft,
                      employeeId: value,
                    });
                  }}
                  placeholder="Employee ID"
                  placeholderTextColor="#6f8f95"
                  style={styles.input}
                  value={props.employeeDraft.employeeId}
                />
                <TextInput
                  onChangeText={value => {
                    props.onEmployeeDraftChange({
                      ...props.employeeDraft,
                      team: value,
                    });
                  }}
                  placeholder="Team"
                  placeholderTextColor="#6f8f95"
                  style={styles.input}
                  value={props.employeeDraft.team}
                />

                <View style={styles.enrollmentCard}>
                  <View style={styles.cameraBox}>
                    <KioskCamera
                      ref={props.cameraRef}
                      isActive
                      onFacesDetected={() => { }}
                    />
                  </View>
                  <View style={styles.previewColumn}>
                    <ProfileImage
                      apiBaseUrl={props.apiSettings.baseUrl}
                      label={props.employeeDraft.name || 'Employee'}
                      uri={props.employeeDraft.photoUri ?? props.employeeDraft.faceImageUrl}
                    />
                    <Text style={styles.previewCaption}>
                      {props.employeeDraft.faceEmbedding?.length
                        ? 'Enrollment features extracted'
                        : 'Capture a clear enrollment photo'}
                    </Text>
                  </View>

                  <View style={styles.enrollmentActions}>
                    <ActionButton
                      kind="secondary"
                      label="Capture photo"
                      onPress={props.onCaptureEmployeePhoto}
                    />
                    <ActionButton label="Save employee" onPress={props.onSaveEmployee} />
                    <ActionButton
                      kind="secondary"
                      label="Cancel"
                      onPress={props.onCancelEmployeeEditor}
                    />
                  </View>
                </View>
              </>
            ) : props.selectedEmployee ? (
              <>
                <Text style={styles.panelTitle}>Employee profile</Text>
                <View style={styles.profileHeader}>
                  <ProfileImage
                    apiBaseUrl={props.apiSettings.baseUrl}
                    label={props.selectedEmployee.name}
                    uri={props.selectedEmployee.faceImageUrl}
                  />
                  <View style={styles.profileBody}>
                    <Text style={styles.profileName}>{props.selectedEmployee.name}</Text>
                    <Text style={styles.profileMeta}>
                      {props.selectedEmployee.employeeId} · {props.selectedEmployee.team}
                    </Text>
                    <Text style={styles.profileMeta}>
                      Embedding v{props.selectedEmployee.embeddingVersion}
                    </Text>
                    <Text style={styles.profileMeta}>
                      Updated {formatTimestamp(props.selectedEmployee.updatedAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <ActionButton
                    label="Edit profile"
                    onPress={() => props.onBeginEditEmployee(props.selectedEmployee!)}
                  />
                  <ActionButton
                    kind="secondary"
                    label="Go to kiosk"
                    onPress={() => props.onSwitchMode('kiosk')}
                  />
                </View>

                <Text style={styles.subsectionTitle}>Recent attendance</Text>
                {selectedAttendance.length === 0 ? (
                  <Text style={styles.emptyState}>No synced attendance for this employee yet.</Text>
                ) : (
                  selectedAttendance.slice(0, 5).map(record => (
                    <View key={record.id} style={styles.historyRow}>
                      <Text style={styles.historyTitle}>{record.type}</Text>
                      <Text style={styles.historyMeta}>{formatTimestamp(record.timestamp)}</Text>
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                <Text style={styles.panelTitle}>No employee selected</Text>
                <Text style={styles.emptyState}>
                  Create the first employee to start onboarding and recognition.
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Backend</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={props.onSetApiUrlDraft}
            placeholder="https://attendance.example.com"
            placeholderTextColor="#6f8f95"
            style={styles.input}
            value={props.apiSettings.draftBaseUrl}
          />
          <View style={styles.actionRow}>
            <ActionButton label="Save API URL" onPress={props.onSaveApiSettings} />
          </View>
        </View>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 18,
  },
  cameraBox: {
    minHeight: 280,
  },
  emptyState: {
    color: '#8fb7be',
    fontSize: 15,
    lineHeight: 22,
  },
  enrollmentActions: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  enrollmentCard: {
    borderRadius: 20,
    backgroundColor: '#0a1f28',
    gap: 14,
    padding: 16,
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
  historyMeta: {
    color: '#8fb7be',
    fontSize: 13,
  },
  historyRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a5563',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  historyTitle: {
    color: '#f2fbfa',
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    borderRadius: 16,
    backgroundColor: '#0a1f28',
    color: '#f2fbfa',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  list: {
    gap: 10,
  },
  listItem: {
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#0a1f28',
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  listItemActive: {
    borderColor: '#7dd3c7',
    borderWidth: 1,
    backgroundColor: '#163847',
  },
  listItemBody: {
    flex: 1,
  },
  listItemMeta: {
    color: '#aac7cc',
    fontSize: 13,
    marginTop: 3,
  },
  listItemTitle: {
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
  panel: {
    borderRadius: 24,
    backgroundColor: '#0d2732',
    gap: 14,
    padding: 18,
  },
  panelTitle: {
    color: '#f2fbfa',
    fontSize: 22,
    fontWeight: '800',
  },
  previewCaption: {
    color: '#8fb7be',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  previewColumn: {
    alignItems: 'center',
    gap: 10,
  },
  profileBody: {
    flex: 1,
    gap: 4,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  profileImage: {
    borderRadius: 24,
    height: 96,
    width: 96,
  },
  profileMeta: {
    color: '#aac7cc',
    fontSize: 14,
    lineHeight: 20,
  },
  profileName: {
    color: '#f2fbfa',
    fontSize: 24,
    fontWeight: '800',
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
  subsectionTitle: {
    color: '#f2fbfa',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
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
  twoColumn: {
    gap: 12,
  },
});

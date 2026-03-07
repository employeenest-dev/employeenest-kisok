import React, { useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';

import { KioskCamera, KioskCameraHandle } from '../../../components/KioskCamera';
import { formatTimestamp, normalizePhotoUri, resolveAssetUrl } from '../../../services/attendance';
import { useAttendance } from '../../../context/AttendanceContext';
import { AttendanceRecord } from '../../../types';

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

export function EmployeeEditorScreen() {
    const navigation = useNavigation();
    const kiosk = useAttendance();
    const cameraRef = useRef<KioskCameraHandle>(null);

    const isEditing = kiosk.employeeEditorMode === 'create' || kiosk.employeeEditorMode === 'edit';
    const selectedAttendance = kiosk.recentAttendance.filter(
        record => record.employeeId === kiosk.selectedEmployee?.id,
    );

    async function capturePhoto() {
        const path = await cameraRef.current?.takePhoto();
        if (!path) {
            kiosk.setLastError('Camera capture failed. Confirm camera permission and device availability.');
            return;
        }
        const uri = normalizePhotoUri(path);
        await kiosk.applyEmployeePhoto(uri);
    }

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>
                    {isEditing
                        ? (kiosk.employeeEditorMode === 'create' ? 'New Onboarding' : 'Edit Profile')
                        : 'Employee Profile'}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {isEditing ? (
                    <View style={styles.panel}>
                        <Text style={styles.panelTitle}>Profile Details</Text>
                        <TextInput
                            onChangeText={value => {
                                kiosk.setEmployeeDraft({
                                    ...kiosk.employeeDraft,
                                    name: value,
                                });
                            }}
                            placeholder="Employee name"
                            placeholderTextColor="#6f8f95"
                            style={styles.input}
                            value={kiosk.employeeDraft.name}
                        />
                        <TextInput
                            autoCapitalize="characters"
                            onChangeText={value => {
                                kiosk.setEmployeeDraft({
                                    ...kiosk.employeeDraft,
                                    employeeId: value,
                                });
                            }}
                            placeholder="Employee ID"
                            placeholderTextColor="#6f8f95"
                            style={styles.input}
                            value={kiosk.employeeDraft.employeeId}
                        />
                        <TextInput
                            onChangeText={value => {
                                kiosk.setEmployeeDraft({
                                    ...kiosk.employeeDraft,
                                    team: value,
                                });
                            }}
                            placeholder="Team"
                            placeholderTextColor="#6f8f95"
                            style={styles.input}
                            value={kiosk.employeeDraft.team}
                        />

                        <View style={styles.enrollmentCard}>
                            <Text style={styles.sectionTitle}>Face Enrollment</Text>
                            <View style={styles.cameraBox}>
                                <KioskCamera
                                    ref={cameraRef}
                                    isActive
                                    onFacesDetected={() => { }}
                                />
                            </View>
                            <View style={styles.previewRow}>
                                <ProfileImage
                                    apiBaseUrl={kiosk.apiSettings.baseUrl}
                                    label={kiosk.employeeDraft.name || 'Employee'}
                                    uri={kiosk.employeeDraft.photoUri ?? kiosk.employeeDraft.faceImageUrl}
                                />
                                <View style={styles.previewInfo}>
                                    <Text style={styles.previewCaption}>
                                        {kiosk.employeeDraft.faceEmbedding?.length
                                            ? 'Enrollment features extracted'
                                            : 'Capture a clear enrollment photo'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.enrollmentActions}>
                                <ActionButton
                                    kind="secondary"
                                    label="Capture Photo"
                                    onPress={capturePhoto}
                                />
                                <ActionButton label="Save Changes" onPress={async () => {
                                    await kiosk.submitEmployeeDraft();
                                    // Navigation back is usually handled by the submission logic or we can do it here
                                    // But wait, submitEmployeeDraft might leave you in edit mode if it failed
                                    // Assuming success for now
                                }} />
                                <ActionButton
                                    kind="secondary"
                                    label="Cancel"
                                    onPress={kiosk.cancelEmployeeEditor}
                                />
                            </View>
                        </View>
                    </View>
                ) : kiosk.selectedEmployee ? (
                    <View style={styles.contentContainer}>
                        <View style={styles.profileHero}>
                            <ProfileImage
                                apiBaseUrl={kiosk.apiSettings.baseUrl}
                                label={kiosk.selectedEmployee.name}
                                uri={kiosk.selectedEmployee.faceImageUrl}
                            />
                            <View style={styles.profileBody}>
                                <Text style={styles.profileName}>{kiosk.selectedEmployee.name}</Text>
                                <Text style={styles.profileMeta}>
                                    {kiosk.selectedEmployee.employeeId} · {kiosk.selectedEmployee.team}
                                </Text>
                                <Text style={styles.profileMeta}>
                                    Updated {formatTimestamp(kiosk.selectedEmployee.updatedAt)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.actionGrid}>
                            <ActionButton
                                label="Edit Profile"
                                onPress={() => kiosk.beginEditEmployee(kiosk.selectedEmployee!)}
                            />
                        </View>

                        <View style={styles.panel}>
                            <Text style={styles.panelTitle}>Recent Attendance</Text>
                            {selectedAttendance.length === 0 ? (
                                <Text style={styles.emptyState}>No synced attendance available for this employee.</Text>
                            ) : (
                                kiosk.recentAttendance.slice(0, 10).map((record: AttendanceRecord) => (
                                    <View key={record.id} style={styles.historyRow}>
                                        <View>
                                            <Text style={styles.historyTitle}>{record.type}</Text>
                                            <Text style={styles.historyMeta}>{formatTimestamp(record.timestamp)}</Text>
                                        </View>
                                        <Text style={styles.historyStatus}>Synced</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>No employee selected</Text>
                    </View>
                )}
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
        flex: 1,
        alignItems: 'center',
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
    actionGrid: {
        flexDirection: 'row',
        gap: 12,
        marginVertical: 10,
    },
    backButton: {
        paddingVertical: 8,
    },
    backButtonText: {
        color: '#7dd3c7',
        fontSize: 16,
        fontWeight: '700',
    },
    cameraBox: {
        height: 300,
        borderRadius: 20,
        overflow: 'hidden',
        marginVertical: 12,
        backgroundColor: '#000',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 18,
    },
    contentContainer: {
        gap: 18,
    },
    emptyState: {
        color: '#8fb7be',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 10,
    },
    emptyStateContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyStateText: {
        color: '#6f8f95',
        fontSize: 18,
    },
    enrollmentActions: {
        gap: 10,
        marginTop: 10,
    },
    enrollmentCard: {
        borderRadius: 20,
        backgroundColor: '#0a1f28',
        padding: 16,
        marginTop: 10,
    },
    header: {
        paddingHorizontal: 20,
        marginTop: 10,
        gap: 4,
    },
    historyMeta: {
        color: '#8fb7be',
        fontSize: 13,
        marginTop: 2,
    },
    historyRow: {
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#2a5563',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    historyStatus: {
        color: '#7dd3c7',
        fontSize: 12,
        fontWeight: '700',
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
        marginTop: 8,
    },
    panel: {
        borderRadius: 24,
        backgroundColor: '#0d2732',
        gap: 12,
        padding: 18,
    },
    panelTitle: {
        color: '#f2fbfa',
        fontSize: 20,
        fontWeight: '800',
    },
    previewCaption: {
        color: '#8fb7be',
        fontSize: 14,
        lineHeight: 20,
    },
    previewInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    previewRow: {
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
    },
    profileBody: {
        flex: 1,
        gap: 4,
    },
    profileHero: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 16,
        backgroundColor: '#0d2732',
        padding: 20,
        borderRadius: 24,
    },
    profileImage: {
        borderRadius: 20,
        height: 80,
        width: 80,
    },
    profileMeta: {
        color: '#aac7cc',
        fontSize: 14,
    },
    profileName: {
        color: '#f2fbfa',
        fontSize: 24,
        fontWeight: '800',
    },
    profilePlaceholder: {
        alignItems: 'center',
        backgroundColor: '#163847',
        borderRadius: 20,
        height: 80,
        justifyContent: 'center',
        width: 80,
    },
    profilePlaceholderText: {
        color: '#7dd3c7',
        fontSize: 24,
        fontWeight: '800',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#04131a',
    },
    sectionTitle: {
        color: '#f2fbfa',
        fontSize: 15,
        fontWeight: '700',
    },
    title: {
        color: '#f2fbfa',
        fontSize: 28,
        fontWeight: '800',
    },
});

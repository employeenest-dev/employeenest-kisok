import React, { useRef } from 'react';
import {
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
import { normalizePhotoUri } from '../../../services/attendance';
import { useAttendance } from '../../../context/AttendanceContext';

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

export function ManualAttendanceScreen() {
    const navigation = useNavigation();
    const kiosk = useAttendance();
    const cameraRef = useRef<KioskCameraHandle>(null);

    async function capturePhoto() {
        const path = await cameraRef.current?.takePhoto();
        if (!path) {
            kiosk.setLastError('Camera capture failed. Confirm camera permission and device availability.');
            return;
        }
        const uri = normalizePhotoUri(path);
        kiosk.applyManualPhoto(uri);
    }

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.eyebrow}>Manual Backup</Text>
                    <Text style={styles.title}>Record attendance manually</Text>
                    <Text style={styles.subtitle}>
                        Search the employee, capture a proof photo, and queue attendance when automatic recognition is not trustworthy.
                    </Text>
                </View>

                <View style={styles.panel}>
                    <TextInput
                        onChangeText={value => {
                            kiosk.setManualDraft({
                                ...kiosk.manualDraft,
                                employeeQuery: value,
                            });
                        }}
                        placeholder="Search name, employee ID, or team"
                        placeholderTextColor="#6f8f95"
                        style={styles.input}
                        value={kiosk.manualDraft.employeeQuery}
                    />

                    <View style={styles.selectionRow}>
                        {(['CHECKIN', 'CHECKOUT'] as const).map(type => (
                            <Pressable
                                key={type}
                                onPress={() => {
                                    kiosk.setManualDraft({
                                        ...kiosk.manualDraft,
                                        type,
                                    });
                                }}
                                style={({ pressed }) => [
                                    styles.toggleButton,
                                    kiosk.manualDraft.type === type && styles.toggleButtonActive,
                                    pressed && { opacity: 0.7 },
                                ]}>
                                <Text
                                    style={[
                                        styles.toggleText,
                                        kiosk.manualDraft.type === type ? styles.toggleTextActive : null,
                                    ]}>
                                    {type}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.cameraBox}>
                        <KioskCamera ref={cameraRef} isActive onFacesDetected={() => { }} />
                    </View>

                    <View style={styles.selectionList}>
                        {kiosk.filteredEmployees.slice(0, 8).map(employee => (
                            <Pressable
                                key={employee.id}
                                onPress={() => {
                                    kiosk.setManualDraft({
                                        ...kiosk.manualDraft,
                                        selectedEmployeeId: employee.id,
                                    });
                                }}
                                style={({ pressed }) => [
                                    styles.employeeOption,
                                    kiosk.manualDraft.selectedEmployeeId === employee.id && styles.employeeOptionSelected,
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
                            label={kiosk.manualDraft.photoUri ? 'Retake proof photo' : 'Capture proof photo'}
                            onPress={capturePhoto}
                        />
                        <ActionButton label="Save attendance" onPress={async () => {
                            await kiosk.submitManualAttendance();
                            navigation.goBack();
                        }} />
                        <ActionButton kind="secondary" label="Cancel" onPress={() => navigation.goBack()} />
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
        marginTop: 10,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 28,
        gap: 18,
    },
    cameraBox: {
        minHeight: 280,
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 10,
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
    eyebrow: {
        color: '#7dd3c7',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    header: {
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 10,
    },
    input: {
        borderRadius: 16,
        backgroundColor: '#0a1f28',
        color: '#f2fbfa',
        fontSize: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    panel: {
        borderRadius: 24,
        backgroundColor: '#0d2732',
        gap: 14,
        padding: 18,
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
    },
    title: {
        color: '#f2fbfa',
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 34,
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
});

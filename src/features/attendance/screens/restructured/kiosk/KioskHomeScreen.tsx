import React, { useRef } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { APP_NAME, DEVICE_ID, OFFICE_NAME } from '../../../../../config/mvp';
import { KioskCamera, KioskCameraHandle } from '../../../components/KioskCamera';
import { ModeSwitch } from '../../../components/ModeSwitch';
import {
    buildSyncLabel,
    formatTimestamp,
    resolveAssetUrl,
} from '../../../services/attendance';
import { useAttendance } from '../../../context/AttendanceContext';
import { RootStackParamList } from '../../../../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'KioskHome'>;

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

export function KioskHomeScreen() {
    const navigation = useNavigation<NavigationProp>();
    const kiosk = useAttendance();
    const cameraRef = useRef<KioskCameraHandle>(null);

    if (!kiosk.initialized) {
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
                        <ModeSwitch mode={kiosk.appMode} onChange={(mode) => {
                            kiosk.setAppMode(mode);
                            if (mode === 'admin') {
                                navigation.navigate('AdminDashboard');
                            }
                        }} />
                        <View style={styles.headerBadge}>
                            <Text style={styles.headerBadgeLabel}>Device</Text>
                            <Text style={styles.headerBadgeValue}>{DEVICE_ID}</Text>
                        </View>
                    </View>
                </View>

                {kiosk.lastError ? (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerText}>{kiosk.lastError}</Text>
                    </View>
                ) : null}

                <View style={styles.heroCard}>
                    <View style={styles.cameraColumn}>
                        <KioskCamera ref={cameraRef} isActive onFacesDetected={kiosk.handleFacesDetected} />
                    </View>

                    <View style={styles.heroBody}>
                        <Text style={styles.heroLabel}>{OFFICE_NAME}</Text>
                        <Text style={styles.heroTitle}>Live recognition gate</Text>
                        <Text style={styles.heroDescription}>{kiosk.recognitionStatus.message}</Text>

                        <View style={styles.outcomePill}>
                            <Text style={styles.outcomePillText}>
                                Faces: {kiosk.recognitionStatus.faceCount} · Route: {kiosk.recognitionStatus.outcome}
                            </Text>
                        </View>

                        <View style={styles.actionRow}>
                            <ActionButton label="Manual fallback" onPress={() => navigation.navigate('ManualAttendance')} />
                            <ActionButton kind="secondary" label="Sync now" onPress={kiosk.syncEverything} />
                            <ActionButton
                                kind="secondary"
                                label="Settings"
                                onPress={() => navigation.navigate('GlobalSettings', { fromKiosk: true })}
                            />
                            <ActionButton
                                kind="secondary"
                                label="Edit employees"
                                onPress={() => {
                                    kiosk.setAppMode('admin');
                                    navigation.navigate('AdminDashboard');
                                }}
                            />
                        </View>
                    </View>
                </View>

                {kiosk.matchedEmployee ? (
                    <View style={styles.panel}>
                        <Text style={styles.panelTitle}>Current automatic match</Text>
                        <View style={styles.matchCard}>
                            <ProfileImage
                                apiBaseUrl={kiosk.apiSettings.baseUrl}
                                label={kiosk.matchedEmployee.name}
                                uri={kiosk.matchedEmployee.faceImageUrl}
                            />
                            <View style={styles.matchBody}>
                                <Text style={styles.matchName}>{kiosk.matchedEmployee.name}</Text>
                                <Text style={styles.matchMeta}>
                                    {kiosk.matchedEmployee.employeeId} · {kiosk.matchedEmployee.team}
                                </Text>
                                <Text style={styles.matchMeta}>
                                    Confidence {kiosk.recognitionStatus.confidence?.toFixed(2) ?? '0.00'}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : null}

                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Cached employees</Text>
                        <Text style={styles.metricValue}>{kiosk.syncState.employeeCount}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Pending queue</Text>
                        <Text style={styles.metricValue}>{kiosk.syncState.pendingUploads}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Last sync</Text>
                        <Text style={styles.metricValue}>{buildSyncLabel(kiosk.syncState)}</Text>
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
    cameraColumn: {
        minHeight: 320,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 28,
        gap: 18,
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
    title: {
        color: '#f2fbfa',
        fontSize: 26,
        fontWeight: '800',
        lineHeight: 32,
    },
    subtitle: {
        color: '#b8d2d5',
        fontSize: 16,
        lineHeight: 23,
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
});

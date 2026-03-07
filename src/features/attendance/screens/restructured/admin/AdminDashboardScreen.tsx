import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { APP_NAME, DEVICE_ID } from '../../../../../config/mvp';
import { ModeSwitch } from '../../../components/ModeSwitch';
import { buildSyncLabel } from '../../../services/attendance';
import { useAttendance } from '../../../context/AttendanceContext';
import { RootStackParamList } from '../../../../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminDashboard'>;

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

function NavCard(props: {
    title: string;
    description: string;
    icon?: string;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => [
                styles.navCard,
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
        >
            <Text style={styles.navCardTitle}>{props.title}</Text>
            <Text style={styles.navCardDescription}>{props.description}</Text>
        </Pressable>
    );
}

export function AdminDashboardScreen() {
    const navigation = useNavigation<NavigationProp>();
    const kiosk = useAttendance();

    if (!kiosk.initialized) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingState}>
                    <Text style={styles.loadingTitle}>{APP_NAME}</Text>
                    <Text style={styles.loadingCopy}>Loading employees and cached device data.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.headerCopy}>
                        <Text style={styles.eyebrow}>Admin Panel</Text>
                        <Text style={styles.title}>Dashboard overview</Text>
                    </View>
                    <View style={styles.headerControls}>
                        <ModeSwitch mode={kiosk.appMode} onChange={(mode) => {
                            kiosk.setAppMode(mode);
                            if (mode === 'kiosk') {
                                navigation.navigate('KioskHome');
                            }
                        }} />
                        <View style={styles.headerBadge}>
                            <Text style={styles.headerBadgeLabel}>Device ID</Text>
                            <Text style={styles.headerBadgeValue}>{DEVICE_ID}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Employees</Text>
                        <Text style={styles.metricValue}>{kiosk.syncState.employeeCount}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Pending uploads</Text>
                        <Text style={styles.metricValue}>{kiosk.syncState.pendingUploads}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Last sync</Text>
                        <Text style={styles.metricValue}>{buildSyncLabel(kiosk.syncState)}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Management</Text>
                    <View style={styles.navGrid}>
                        <NavCard
                            title="Employee Directory"
                            description="View and search all enrolled employees"
                            onPress={() => navigation.navigate('EmployeeDirectory')}
                        />
                        <NavCard
                            title="Add Employee"
                            description="Onboard a new employee with face capture"
                            onPress={() => {
                                kiosk.beginCreateEmployee();
                                navigation.navigate('EmployeeEditor', {});
                            }}
                        />
                        <NavCard
                            title="Activity Logs"
                            description="View recent history and pending sync queue"
                            onPress={() => navigation.navigate('RecentActivity')}
                        />
                        <NavCard
                            title="System Settings"
                            description="Configure API URL and backend connection"
                            onPress={() => navigation.navigate('GlobalSettings', { fromKiosk: false })}
                        />
                    </View>
                </View>

                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Quick Actions</Text>
                    <View style={styles.actionRow}>
                        <ActionButton kind="secondary" label="Sync now" onPress={kiosk.syncEverything} />
                        <ActionButton
                            kind="primary"
                            label="Launch kiosk mode"
                            onPress={() => {
                                kiosk.setAppMode('kiosk');
                                navigation.navigate('KioskHome');
                            }}
                        />
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
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    actionButtonSecondary: {
        backgroundColor: '#133947',
    },
    actionButtonText: {
        color: '#04131a',
        fontSize: 16,
        fontWeight: '800',
    },
    actionButtonTextSecondary: {
        color: '#d9ecef',
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 28,
        gap: 20,
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
        marginTop: 10,
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
        gap: 4,
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
        minWidth: 140,
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
    navCard: {
        backgroundColor: '#0d2732',
        borderRadius: 20,
        padding: 18,
        width: '100%',
        borderLeftWidth: 4,
        borderLeftColor: '#7dd3c7',
    },
    navCardTitle: {
        color: '#f2fbfa',
        fontSize: 18,
        fontWeight: '800',
    },
    navCardDescription: {
        color: '#8fb7be',
        fontSize: 14,
        marginTop: 4,
    },
    navGrid: {
        gap: 12,
    },
    panel: {
        borderRadius: 24,
        backgroundColor: '#0d2732',
        gap: 16,
        padding: 20,
    },
    panelTitle: {
        color: '#f2fbfa',
        fontSize: 20,
        fontWeight: '800',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#04131a',
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        color: '#f2fbfa',
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 4,
    },
    title: {
        color: '#f2fbfa',
        fontSize: 32,
        fontWeight: '800',
    },
});

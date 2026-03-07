import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { describeAttendance, formatTimestamp } from '../../../services/attendance';
import { useAttendance } from '../../../context/AttendanceContext';

export function RecentActivityScreen() {
    const navigation = useNavigation();
    const kiosk = useAttendance();

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>Recent Activity</Text>
                <Text style={styles.subtitle}>Audit logs of synced and pending attendance</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Synced History</Text>
                    {kiosk.recentAttendance.length === 0 ? (
                        <Text style={styles.emptyState}>No attendance has synced yet.</Text>
                    ) : (
                        kiosk.recentAttendance.map(record => (
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

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pending Uploads</Text>
                    {kiosk.pendingAttendance.length === 0 ? (
                        <Text style={styles.emptyState}>No offline attendance is waiting to sync.</Text>
                    ) : (
                        kiosk.pendingAttendance.map(record => (
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
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    backButton: {
        paddingVertical: 8,
    },
    backButtonText: {
        color: '#7dd3c7',
        fontSize: 16,
        fontWeight: '700',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 24,
    },
    emptyState: {
        color: '#8fb7be',
        fontSize: 15,
        marginTop: 8,
    },
    header: {
        paddingHorizontal: 20,
        marginTop: 10,
        gap: 4,
        marginBottom: 10,
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
        paddingVertical: 14,
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
    safeArea: {
        flex: 1,
        backgroundColor: '#04131a',
    },
    section: {
        backgroundColor: '#0d2732',
        borderRadius: 24,
        padding: 20,
    },
    sectionTitle: {
        color: '#f2fbfa',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        color: '#b8d2d5',
        fontSize: 16,
    },
    title: {
        color: '#f2fbfa',
        fontSize: 28,
        fontWeight: '800',
    },
});

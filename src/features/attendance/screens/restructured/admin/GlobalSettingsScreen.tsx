import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { ApiSettingsPanel } from '../../../components/ApiSettingsPanel';
import { useAttendance } from '../../../context/AttendanceContext';
import { RootStackParamList } from '../../../../../navigation/types';

type SettingsRouteProp = RouteProp<RootStackParamList, 'GlobalSettings'>;

export function GlobalSettingsScreen() {
    const navigation = useNavigation();
    const route = useRoute<SettingsRouteProp>();
    const kiosk = useAttendance();

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>System Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <ApiSettingsPanel
                    apiSettings={kiosk.apiSettings}
                    backendPingState={kiosk.backendPingState}
                    onClose={() => navigation.goBack()}
                    onPingBackend={kiosk.pingBackend}
                    onSaveApiSettings={kiosk.saveApiSettings}
                    onSelectApiRuntimePreset={kiosk.selectApiRuntimePreset}
                    onSetApiUrlDraft={kiosk.setApiUrlDraft}
                    title="Backend Connection"
                />

                <View style={styles.infoPanel}>
                    <Text style={styles.infoTitle}>About Device</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>App Version</Text>
                        <Text style={styles.infoValue}>1.0.0</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Platform</Text>
                        <Text style={styles.infoValue}>Android/iOS Native</Text>
                    </View>
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
        gap: 20,
    },
    header: {
        paddingHorizontal: 20,
        marginTop: 10,
        gap: 4,
        marginBottom: 10,
    },
    infoPanel: {
        backgroundColor: '#0d2732',
        borderRadius: 24,
        padding: 20,
        gap: 12,
    },
    infoTitle: {
        color: '#f2fbfa',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#2a5563',
        paddingVertical: 10,
    },
    infoLabel: {
        color: '#8fb7be',
        fontSize: 14,
    },
    infoValue: {
        color: '#f2fbfa',
        fontSize: 14,
        fontWeight: '600',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#04131a',
    },
    title: {
        color: '#f2fbfa',
        fontSize: 28,
        fontWeight: '800',
    },
});

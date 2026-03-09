import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { useAttendance } from '../../../context/AttendanceContext';
import { RootStackParamList } from '../../../../../navigation/types';

type SettingsRouteProp = RouteProp<RootStackParamList, 'GlobalSettings'>;

export function GlobalSettingsScreen() {
    const navigation = useNavigation();
    const route = useRoute<SettingsRouteProp>();
    const kiosk = useAttendance();

    const handleReset = () => {
        Alert.alert(
            'Clear All Local Data',
            'Are you sure? This will permanently delete all employees and attendance records from this device.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: () => {
                        kiosk.clearAllData();
                        navigation.goBack();
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>System Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.infoPanel}>
                    <Text style={styles.infoTitle}>Standalone Configuration</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Database</Text>
                        <Text style={styles.infoValue}>Local (MMKV)</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Connected Device</Text>
                        <Text style={styles.infoValue}>Native Terminal 01</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>System Status</Text>
                        <Text style={styles.infoValue}>Fully Standalone</Text>
                    </View>
                </View>

                <View style={styles.infoPanel}>
                    <Text style={styles.infoTitle}>Data Management</Text>
                    <Text style={styles.infoCopy}>
                        Manage the local state of this tablet. Resetting will clear all locally enrolled faces.
                    </Text>
                    <Pressable
                        onPress={handleReset}
                        style={({ pressed }) => [
                            styles.resetButton,
                            pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                        ]}
                    >
                        <Text style={styles.resetButtonText}>Clear All Local Data</Text>
                    </Pressable>
                </View>

                <View style={styles.infoPanel}>
                    <Text style={styles.infoTitle}>About Device</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>App Version</Text>
                        <Text style={styles.infoValue}>1.0.0 (Offline Build)</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Platform</Text>
                        <Text style={styles.infoValue}>Android/iOS Standalone</Text>
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
    infoCopy: {
        color: '#8fb7be',
        fontSize: 14,
        lineHeight: 20,
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
    resetButton: {
        backgroundColor: '#572727',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    resetButtonText: {
        color: '#ffcbcb',
        fontSize: 15,
        fontWeight: '700',
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

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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { resolveAssetUrl } from '../../../services/attendance';
import { useAttendance } from '../../../context/AttendanceContext';
import { RootStackParamList } from '../../../../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EmployeeDirectory'>;

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

export function EmployeeDirectoryScreen() {
    const navigation = useNavigation<NavigationProp>();
    const kiosk = useAttendance();

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>Employee directory</Text>
                <Text style={styles.subtitle}>View and manage all enrolled members</Text>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    onChangeText={kiosk.setEmployeeQuery}
                    placeholder="Search name, ID, or team"
                    placeholderTextColor="#6f8f95"
                    style={styles.input}
                    value={kiosk.employeeQuery}
                />
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {kiosk.directoryEmployees.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No employees found.</Text>
                    </View>
                ) : (
                    kiosk.directoryEmployees.map(employee => (
                        <Pressable
                            key={employee.id}
                            onPress={() => {
                                kiosk.selectEmployee(employee.id);
                                navigation.navigate('EmployeeEditor', { employeeId: employee.id });
                            }}
                            style={({ pressed }) => [
                                styles.listItem,
                                pressed && { opacity: 0.7 },
                            ]}>
                            <ProfileImage
                                apiBaseUrl={kiosk.apiSettings.baseUrl}
                                label={employee.name}
                                uri={employee.faceImageUrl}
                            />
                            <View style={styles.listItemBody}>
                                <Text style={styles.listItemTitle}>{employee.name}</Text>
                                <Text style={styles.listItemMeta}>
                                    {employee.employeeId} · {employee.team}
                                </Text>
                                <Text style={[
                                    styles.listItemStatus,
                                    employee.faceEmbedding.length > 0 ? styles.statusReady : styles.statusMissing
                                ]}>
                                    {employee.faceEmbedding.length > 0
                                        ? '● Recognition ready'
                                        : '○ Needs enrollment'}
                                </Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            <View style={styles.fabContainer}>
                <Pressable
                    onPress={() => {
                        kiosk.beginCreateEmployee();
                        navigation.navigate('EmployeeEditor', {});
                    }}
                    style={styles.fab}
                >
                    <Text style={styles.fabText}>+ Add Employee</Text>
                </Pressable>
            </View>
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
    chevron: {
        color: '#4a7483',
        fontSize: 24,
        fontWeight: '300',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyStateText: {
        color: '#6f8f95',
        fontSize: 16,
    },
    fab: {
        backgroundColor: '#7dd3c7',
        borderRadius: 30,
        paddingHorizontal: 24,
        paddingVertical: 14,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    fabText: {
        color: '#04131a',
        fontSize: 16,
        fontWeight: '800',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 30,
        right: 20,
    },
    header: {
        paddingHorizontal: 20,
        marginTop: 10,
        gap: 4,
    },
    input: {
        borderRadius: 16,
        backgroundColor: '#0a1f28',
        color: '#f2fbfa',
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    list: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 100,
        gap: 12,
    },
    listItem: {
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#112b36',
        flexDirection: 'row',
        gap: 14,
        padding: 14,
    },
    listItemBody: {
        flex: 1,
    },
    listItemMeta: {
        color: '#aac7cc',
        fontSize: 13,
        marginTop: 2,
    },
    listItemStatus: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
    listItemTitle: {
        color: '#f2fbfa',
        fontSize: 17,
        fontWeight: '700',
    },
    profileImage: {
        borderRadius: 16,
        height: 56,
        width: 56,
    },
    profilePlaceholder: {
        alignItems: 'center',
        backgroundColor: '#163847',
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        width: 56,
    },
    profilePlaceholderText: {
        color: '#7dd3c7',
        fontSize: 18,
        fontWeight: '800',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#04131a',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginVertical: 16,
    },
    statusMissing: {
        color: '#f7b267',
    },
    statusReady: {
        color: '#7dd3c7',
    },
    subtitle: {
        color: '#b8d2d5',
        fontSize: 15,
    },
    title: {
        color: '#f2fbfa',
        fontSize: 28,
        fontWeight: '800',
    },
});

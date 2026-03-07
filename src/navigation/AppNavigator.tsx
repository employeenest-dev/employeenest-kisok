import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { KioskHomeScreen } from '../features/attendance/screens/restructured/kiosk/KioskHomeScreen';
import { ManualAttendanceScreen } from '../features/attendance/screens/restructured/kiosk/ManualAttendanceScreen';
import { AdminDashboardScreen } from '../features/attendance/screens/restructured/admin/AdminDashboardScreen';
import { EmployeeDirectoryScreen } from '../features/attendance/screens/restructured/admin/EmployeeDirectoryScreen';
import { EmployeeEditorScreen } from '../features/attendance/screens/restructured/admin/EmployeeEditorScreen';
import { GlobalSettingsScreen } from '../features/attendance/screens/restructured/admin/GlobalSettingsScreen';
import { RecentActivityScreen } from '../features/attendance/screens/restructured/admin/RecentActivityScreen';
import { useAttendance } from '../features/attendance/context/AttendanceContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
    const { appMode } = useAttendance();

    return (
        <Stack.Navigator
            initialRouteName={appMode === 'admin' ? 'AdminDashboard' : 'KioskHome'}
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            {/* Kiosk Flow */}
            <Stack.Screen name="KioskHome" component={KioskHomeScreen} />
            <Stack.Screen name="ManualAttendance" component={ManualAttendanceScreen} />

            {/* Admin Flow */}
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
            <Stack.Screen name="EmployeeEditor" component={EmployeeEditorScreen} />

            {/* Settings */}
            <Stack.Screen name="GlobalSettings" component={GlobalSettingsScreen} />
            <Stack.Screen name="RecentActivity" component={RecentActivityScreen} />
        </Stack.Navigator>
    );
}

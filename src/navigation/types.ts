export type RootStackParamList = {
    KioskHome: undefined;
    ManualAttendance: undefined;
    AdminDashboard: undefined;
    EmployeeDirectory: undefined;
    EmployeeEditor: { employeeId?: string };
    GlobalSettings: { fromKiosk?: boolean };
    RecentActivity: undefined;
};

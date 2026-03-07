import React, { createContext, useContext, ReactNode } from 'react';
import { useAttendanceKiosk } from '../hooks/useAttendanceKiosk';

type AttendanceContextType = ReturnType<typeof useAttendanceKiosk>;

const AttendanceContext = createContext<AttendanceContextType | null>(null);

export function AttendanceProvider({ children }: { children: ReactNode }) {
    const kiosk = useAttendanceKiosk();
    return (
        <AttendanceContext.Provider value={kiosk}>
            {children}
        </AttendanceContext.Provider>
    );
}

export function useAttendance() {
    const context = useContext(AttendanceContext);
    if (!context) {
        throw new Error('useAttendance must be used within an AttendanceProvider');
    }
    return context;
}

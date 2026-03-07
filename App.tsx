import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AttendanceKioskApp } from './src/app/AttendanceKioskApp';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#04131a" />
      <AttendanceKioskApp />
    </SafeAreaProvider>
  );
}

export default App;

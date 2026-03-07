import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NavigationContainer } from '@react-navigation/native';
import { AttendanceProvider } from './src/features/attendance/context/AttendanceContext';
import { AppNavigator } from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#04131a" />
      <AttendanceProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AttendanceProvider>
    </SafeAreaProvider>
  );
}

export default App;

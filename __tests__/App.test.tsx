/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-safe-area-context', () => {
  const ReactNative = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({
      children,
      style,
    }: {
      children: React.ReactNode;
      style?: object;
    }) => <ReactNative.View style={style}>{children}</ReactNative.View>,
  };
});

test('renders the attendance kiosk shell', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const output = JSON.stringify(renderer.toJSON());

  expect(output).toContain('Attendance Kiosk');
  expect(output).toContain('Employee onboarding and profile management');
  expect(output).toContain('Asha Menon');
  expect(output).toContain('Pranav Rao');
});

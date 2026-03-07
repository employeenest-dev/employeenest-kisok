import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMode } from '../types';

interface ModeSwitchProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export function ModeSwitch(props: ModeSwitchProps) {
  return (
    <View style={styles.container}>
      {(['admin', 'kiosk'] as const).map(mode => (
        <Pressable
          key={mode}
          onPress={() => props.onChange(mode)}
          style={({ pressed }) => [
            styles.button,
            props.mode === mode && styles.buttonActive,
            pressed && { opacity: 0.7 }
          ]}>
          <Text
            style={[styles.text, props.mode === mode ? styles.textActive : null]}>
            {mode === 'admin' ? 'Employees' : 'Kiosk'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonActive: {
    backgroundColor: '#7dd3c7',
  },
  container: {
    alignSelf: 'flex-start',
    backgroundColor: '#0d2732',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  text: {
    color: '#8fb7be',
    fontSize: 14,
    fontWeight: '700',
  },
  textActive: {
    color: '#04131a',
  },
});

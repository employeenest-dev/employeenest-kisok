import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ApiRuntimePreset,
  ApiSettings,
  BackendPingState,
} from '../types';

interface ApiSettingsPanelProps {
  apiSettings: ApiSettings;
  backendPingState: BackendPingState;
  onClose?: () => void;
  onPingBackend: () => void | Promise<void>;
  onSaveApiSettings: () => void;
  onSelectApiRuntimePreset: (preset: ApiRuntimePreset) => void;
  onSetApiUrlDraft: (value: string) => void;
  title: string;
}

function ActionButton(props: {
  kind?: 'primary' | 'secondary';
  label: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.actionButton,
        props.kind === 'secondary' && styles.actionButtonSecondary,
        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
      ]}>
      <Text
        style={[
          styles.actionButtonText,
          props.kind === 'secondary' ? styles.actionButtonTextSecondary : null,
        ]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

export function ApiSettingsPanel(props: ApiSettingsPanelProps) {
  const selectedRuntime =
    props.apiSettings.runtimeOptions.find(
      option => option.id === props.apiSettings.runtimePreset,
    ) ?? props.apiSettings.runtimeOptions[0];

  const placeholder =
    selectedRuntime?.suggestedUrl ??
    (props.apiSettings.runtimePreset === 'custom'
      ? 'https://attendance.example.com'
      : 'http://192.168.1.20:4000');

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{props.title}</Text>
      <Text style={styles.currentLabel}>Current API URL</Text>
      <Text style={styles.currentValue}>{props.apiSettings.baseUrl}</Text>

      <Text style={styles.sectionLabel}>Runtime target</Text>
      <View style={styles.runtimeGrid}>
        {props.apiSettings.runtimeOptions.map(option => (
          <Pressable
            key={option.id}
            onPress={() => props.onSelectApiRuntimePreset(option.id)}
            style={({ pressed }) => [
              styles.runtimeOption,
              props.apiSettings.runtimePreset === option.id &&
                styles.runtimeOptionActive,
              pressed && { opacity: 0.7 },
            ]}>
            <Text
              style={[
                styles.runtimeOptionTitle,
                props.apiSettings.runtimePreset === option.id &&
                  styles.runtimeOptionTitleActive,
              ]}>
              {option.label}
            </Text>
            <Text style={styles.runtimeOptionCopy}>{option.description}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Draft API URL</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        onChangeText={props.onSetApiUrlDraft}
        placeholder={placeholder}
        placeholderTextColor="#6f8f95"
        style={styles.input}
        value={props.apiSettings.draftBaseUrl}
      />

      {props.backendPingState.message ? (
        <View
          style={[
            styles.statusCard,
            props.backendPingState.status === 'success'
              ? styles.statusCardSuccess
              : props.backendPingState.status === 'error'
                ? styles.statusCardError
                : null,
          ]}>
          <Text style={styles.statusText}>{props.backendPingState.message}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <ActionButton
          kind="secondary"
          label={props.backendPingState.testing ? 'Pinging...' : 'Ping backend'}
          onPress={props.onPingBackend}
        />
        <ActionButton label="Save API URL" onPress={props.onSaveApiSettings} />
        {props.onClose ? (
          <ActionButton kind="secondary" label="Close" onPress={props.onClose} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 999,
    backgroundColor: '#7dd3c7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonSecondary: {
    backgroundColor: '#133947',
  },
  actionButtonText: {
    color: '#04131a',
    fontSize: 15,
    fontWeight: '800',
  },
  actionButtonTextSecondary: {
    color: '#d9ecef',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  currentLabel: {
    color: '#8fb7be',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  currentValue: {
    color: '#f2fbfa',
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    borderRadius: 16,
    backgroundColor: '#0a1f28',
    color: '#f2fbfa',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  panel: {
    borderRadius: 24,
    backgroundColor: '#0d2732',
    gap: 14,
    padding: 18,
  },
  panelTitle: {
    color: '#f2fbfa',
    fontSize: 22,
    fontWeight: '800',
  },
  runtimeGrid: {
    gap: 10,
  },
  runtimeOption: {
    borderRadius: 18,
    backgroundColor: '#0a1f28',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  runtimeOptionActive: {
    borderColor: '#7dd3c7',
    borderWidth: 1,
    backgroundColor: '#163847',
  },
  runtimeOptionCopy: {
    color: '#aac7cc',
    fontSize: 13,
    lineHeight: 19,
  },
  runtimeOptionTitle: {
    color: '#f2fbfa',
    fontSize: 16,
    fontWeight: '700',
  },
  runtimeOptionTitleActive: {
    color: '#7dd3c7',
  },
  sectionLabel: {
    color: '#8fb7be',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusCard: {
    borderRadius: 16,
    backgroundColor: '#0a1f28',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusCardError: {
    backgroundColor: '#572727',
  },
  statusCardSuccess: {
    backgroundColor: '#15392a',
  },
  statusText: {
    color: '#f2fbfa',
    fontSize: 14,
    lineHeight: 20,
  },
});

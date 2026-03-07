interface StorageBackend {
  delete: (key: string) => void;
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
}

const fallbackStorage = new Map<string, string>();

function createFallbackStorage(): StorageBackend {
  return {
    delete: key => {
      fallbackStorage.delete(key);
    },
    getString: key => fallbackStorage.get(key),
    set: (key, value) => {
      fallbackStorage.set(key, value);
    },
  };
}

function createStorageBackend(): StorageBackend {
  try {
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const storage = createMMKV({ id: 'attendance-kiosk-storage' });

    return {
      delete: key => {
        storage.remove(key);
      },
      getString: key => storage.getString(key) ?? undefined,
      set: (key, value) => {
        storage.set(key, value);
      },
    };
  } catch {
    return createFallbackStorage();
  }
}

const storage = createStorageBackend();

export function readStoredJson<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

export function readStoredString(key: string, fallback = ''): string {
  return storage.getString(key) ?? fallback;
}

export function writeStoredString(key: string, value: string): void {
  storage.set(key, value);
}

export function deleteStoredValue(key: string): void {
  storage.delete(key);
}

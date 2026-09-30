// On iOS/Android this installs a localStorage backed by SQLite; on web it is a no-op and the browser's is used.
import 'expo-sqlite/localStorage/install';

const PREFIX = 'rootline:v1:';

export type StoredKey = 'habits' | 'events' | 'sessions' | 'focus' | 'settings' | 'sync';

/** Synchronous read so the app starts with saved data already in place (no empty first frame). */
export function load<T>(key: StoredKey, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: StoredKey, value: unknown) {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (e.g. private browsing). The app keeps working in memory.
  }
}

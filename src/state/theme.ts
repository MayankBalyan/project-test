import { useSyncExternalStore } from 'react';

import { load, save } from './persist';

/** Light, dark, or follow the device. Saved per device (not synced), like most apps. */
export type ThemePreference = 'system' | 'light' | 'dark';

let preference: ThemePreference = load<ThemePreference>('theme', 'system');
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  save('theme', next);
  listeners.forEach((l) => l());
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    subscribe,
    () => preference,
    () => preference,
  );
}

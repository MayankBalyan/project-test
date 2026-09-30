import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemePreference } from '@/state/theme';

/** The scheme the app draws in: the user's choice in Settings, or the device's when set to System. */
export function useColorScheme(): 'light' | 'dark' {
  const preference = useThemePreference();
  const system = useSystemColorScheme();
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

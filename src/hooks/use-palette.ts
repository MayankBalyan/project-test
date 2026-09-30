import { useWindowDimensions } from 'react-native';

import { Colors, WideBreakpoint } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function usePalette() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

export function useIsWide() {
  return useWindowDimensions().width >= WideBreakpoint;
}

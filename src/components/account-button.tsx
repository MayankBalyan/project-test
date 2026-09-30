import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useAuth } from '@/state/auth';

import { Txt } from './ui';

/** "Sign in" pill when signed out; the account's initial in an ink circle when signed in. */
export function AccountButton() {
  const palette = usePalette();
  const { user } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase();

  return (
    <Pressable
      role="button"
      aria-label={user ? 'Your account' : 'Sign in'}
      onPress={() => router.push('/account')}
      hitSlop={8}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: palette.ink, transform: [{ scale: pressed ? 0.96 : 1 }] },
        user && { backgroundColor: palette.ink },
      ]}>
      {user ? (
        <Txt variant="label" tone="paper" style={styles.initial}>
          {initial ?? '•'}
        </Txt>
      ) : (
        <View style={styles.row}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Circle cx={12} cy={8} r={4} stroke={palette.ink} strokeWidth={2.2} fill="none" />
            <Path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" stroke={palette.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          </Svg>
          <Txt variant="label">Sign in</Txt>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 36,
    height: 36,
    borderWidth: 2,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  initial: { fontSize: 15 },
});

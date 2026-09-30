import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useAuth } from '@/state/auth';

import { LogoMark } from './ink-art';
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

/** Phone-only header row: brand on the left, settings and account on the right. */
export function PhoneTopBar() {
  return (
    <View style={styles.topRow}>
      <View style={styles.row}>
        <LogoMark size={24} />
        <Txt variant="label">Istel</Txt>
      </View>
      <View style={[styles.row, styles.gap]}>
        <SettingsButton />
        <AccountButton />
      </View>
    </View>
  );
}

export function SettingsButton() {
  const palette = usePalette();
  return (
    <Pressable
      role="button"
      aria-label="Settings"
      onPress={() => router.push('/settings')}
      hitSlop={8}
      style={({ pressed }) => [styles.round, { borderColor: palette.ink, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={3.2} stroke={palette.ink} strokeWidth={2.2} fill="none" />
        <Path
          d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
          stroke={palette.ink}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  gap: { gap: Spacing.two },
});

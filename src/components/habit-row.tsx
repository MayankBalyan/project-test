import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { Schedule } from '@/core/habits';
import { usePalette } from '@/hooks/use-palette';

import { Txt } from './ui';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeSchedule(s: Schedule): string {
  switch (s.type) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return s.days.map((d) => DAY_NAMES[d]).join(' ');
    case 'everyNDays':
      return `Every ${s.n} days`;
    case 'timesPerWeek':
      return `${s.times}× a week`;
  }
}

export function HabitRow({
  name,
  detail,
  done,
  progress,
  streak,
  streakUnit,
  onToggle,
}: {
  name: string;
  detail: string;
  done: boolean;
  /** 0–1 for count habits. */
  progress?: number;
  streak: number;
  streakUnit: string;
  onToggle: () => void;
}) {
  const palette = usePalette();
  return (
    <Pressable
      role="checkbox"
      aria-checked={done}
      accessibilityLabel={`${name}, ${detail}`}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        { borderColor: palette.ink, backgroundColor: palette.surface, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}>
      <View style={[styles.check, { borderColor: palette.ink, backgroundColor: done ? palette.ink : 'transparent' }]}>
        {done ? (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M4 12.5l5 5L20 6.5" stroke={palette.paper} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          </Svg>
        ) : progress ? (
          <View style={[styles.fill, { backgroundColor: palette.ink, height: `${progress * 100}%` }]} />
        ) : null}
      </View>
      <View style={styles.text}>
        <Txt variant="label" style={[styles.name, done && { textDecorationLine: 'line-through' }]}>
          {name}
        </Txt>
        <Txt variant="caption" tone="inkSoft">
          {detail}
        </Txt>
      </View>
      <View style={styles.streak}>
        <Txt style={[styles.streakNumber, { color: palette.ink }]}>{streak}</Txt>
        <Txt variant="caption" tone="muted">
          {streakUnit}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 2,
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 17 },
  streak: { alignItems: 'center', minWidth: 48 },
  streakNumber: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 30 },
});

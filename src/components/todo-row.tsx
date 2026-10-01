import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

import { Txt } from './ui';

/** One to-do: tap to tick it off, ⋯ to edit or delete. Late ones say so in bold. */
export function TodoRow({
  title,
  due,
  late,
  done,
  hasNotes,
  onToggle,
  onEdit,
}: {
  title: string;
  due: string;
  late: boolean;
  done: boolean;
  hasNotes?: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const palette = usePalette();
  return (
    <Pressable
      role="checkbox"
      aria-checked={done}
      accessibilityLabel={`${title}, ${due}`}
      onPress={onToggle}
      onLongPress={onEdit}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: done ? palette.line : palette.ink,
          backgroundColor: palette.surface,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      <View style={[styles.check, { borderColor: palette.ink, backgroundColor: done ? palette.ink : 'transparent' }]}>
        {done && (
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M4 12.5l5 5L20 6.5" stroke={palette.paper} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          </Svg>
        )}
      </View>
      <View style={styles.text}>
        <Txt
          variant="label"
          tone={done ? 'muted' : 'ink'}
          style={[styles.title, done && { textDecorationLine: 'line-through' }]}>
          {title}
        </Txt>
        <Txt variant={late ? 'bodyBold' : 'caption'} tone={late ? 'ink' : 'inkSoft'} style={late && styles.late}>
          {late ? '✦ ' : ''}
          {due}
          {hasNotes ? ' · notes' : ''}
        </Txt>
      </View>
      <Pressable
        role="button"
        aria-label={`Edit or delete ${title}`}
        onPress={onEdit}
        hitSlop={8}
        style={({ pressed }) => [styles.more, { borderColor: palette.line, opacity: pressed ? 0.6 : 1 }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          {[5, 12, 19].map((x) => (
            <Circle key={x} cx={x} cy={12} r={2.2} fill={palette.ink} />
          ))}
        </Svg>
      </Pressable>
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
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16 },
  late: { fontSize: 12 },
  more: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

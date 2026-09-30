import { ReactNode, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useIsWide, usePalette } from '@/hooks/use-palette';

type TxtVariant = 'body' | 'bodyBold' | 'label' | 'section' | 'caption';

const variantStyle = {
  body: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 21, letterSpacing: 0.5 },
  bodyBold: { fontFamily: Fonts.bodyBold, fontSize: 14, lineHeight: 21, letterSpacing: 0.5 },
  label: { fontFamily: Fonts.label, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  section: { fontFamily: Fonts.labelBold, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' },
  caption: { fontFamily: Fonts.body, fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
} as const;

export function Txt({
  variant = 'body',
  tone = 'ink',
  style,
  ...props
}: TextProps & { variant?: TxtVariant; tone?: 'ink' | 'inkSoft' | 'muted' | 'face' | 'paper' }) {
  const palette = usePalette();
  return <Text {...props} style={[variantStyle[variant], { color: palette[tone] }, style]} />;
}

const grain = require('@/assets/textures/grain.png');

/** Paper background with grain, safe-area padding and a centered content column. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const wide = useIsWide();
  const content = (
    <View
      style={[
        styles.column,
        { paddingTop: wide ? Spacing.four : insets.top + Spacing.three, paddingBottom: wide ? Spacing.six : 120 },
      ]}>
      {children}
    </View>
  );
  return (
    <View style={[styles.fill, { backgroundColor: palette.paper }]}>
      <Image source={grain} resizeMode="repeat" style={[StyleSheet.absoluteFill, styles.grain]} />
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.ink }, style]}>{children}</View>
  );
}

export function InkButton({
  label,
  onPress,
  kind = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'outline';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const primary = kind === 'primary';
  return (
    <Pressable
      role="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? palette.ink : 'transparent',
          borderColor: palette.ink,
          opacity: disabled ? 0.35 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}>
      <Txt variant="label" tone={primary ? 'paper' : 'ink'} style={styles.buttonLabel}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const palette = usePalette();
  return (
    <Pressable
      role="button"
      aria-selected={selected}
      onPress={onPress}
      style={[styles.chip, { borderColor: palette.ink, backgroundColor: selected ? palette.ink : 'transparent' }]}>
      <Txt variant="label" tone={selected ? 'paper' : 'ink'}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  const palette = usePalette();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Txt variant="label" tone="inkSoft">
        {label}
      </Txt>
      <TextInput
        {...props}
        aria-label={label}
        placeholderTextColor={palette.muted}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: palette.ink,
            backgroundColor: palette.surface,
            borderColor: palette.ink,
            borderWidth: focused ? 3 : 2,
            paddingHorizontal: focused ? Spacing.three - 1 : Spacing.three,
          },
        ]}
      />
    </View>
  );
}

/** − value + control for small whole numbers. */
export function Stepper({
  value,
  min,
  max,
  unit,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  onChange: (value: number) => void;
}) {
  const palette = usePalette();
  const button = (sign: -1 | 1) => {
    const next = value + sign;
    const disabled = next < min || next > max;
    return (
      <Pressable
        role="button"
        aria-label={`${sign < 0 ? 'Decrease' : 'Increase'} ${label}`}
        disabled={disabled}
        onPress={() => onChange(next)}
        style={[styles.stepButton, { borderColor: palette.ink, opacity: disabled ? 0.3 : 1 }]}>
        <Txt variant="section" style={styles.stepSign}>
          {sign < 0 ? '−' : '+'}
        </Txt>
      </Pressable>
    );
  };
  return (
    <View style={styles.stepper} aria-label={label}>
      {button(-1)}
      <Txt style={[styles.stepValue, { color: palette.ink }]}>{value}</Txt>
      {button(1)}
      <Txt variant="caption" tone="inkSoft">
        {unit}
      </Txt>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Txt variant="section">{children}</Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grain: { width: '100%', height: '100%', opacity: 0.9 },
  scroll: { flexGrow: 1 },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Gutter,
    gap: Spacing.four,
  },
  card: {
    borderWidth: 2,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
  button: {
    borderWidth: 2,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 16 },
  chip: {
    borderWidth: 2,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  field: { gap: Spacing.two },
  input: {
    fontFamily: Fonts.body,
    fontSize: 16,
    borderRadius: Radius.card - 6,
    paddingVertical: 14,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSign: { lineHeight: 24 },
  stepValue: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 36, minWidth: 36, textAlign: 'center' },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
});

import { TabList, TabListProps, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useIsWide, usePalette } from '@/hooks/use-palette';
import { useIstel } from '@/state/store';

import { AccountButton, SettingsButton } from './account-button';
import { LogoMark, TabIcon, TabIconName } from './ink-art';
import { SlidingTabSlot } from './sliding-tab-slot';
import { Txt } from './ui';

const TABS: { name: string; href: '/' | '/focus' | '/island' | '/streaks'; label: string; icon: TabIconName }[] = [
  { name: 'index', href: '/', label: 'Today', icon: 'today' },
  { name: 'focus', href: '/focus', label: 'Focus', icon: 'focus' },
  { name: 'island', href: '/island', label: 'Island', icon: 'island' },
  { name: 'streaks', href: '/streaks', label: 'Streaks', icon: 'streaks' },
];
const TAB_ORDER = TABS.map((t) => t.href);

/**
 * One themed tab bar for every platform: a top nav (like the reference) on wide screens and a floating
 * ink pill at the bottom on phones.
 */
export default function AppTabs() {
  const wide = useIsWide();
  const { settings } = useIstel();
  return (
    <Tabs>
      {wide ? null : <SlidingTabSlot order={TAB_ORDER} style={styles.slot} />}
      <TabList asChild>
        <Bar wide={wide}>
          {TABS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton icon={t.icon} wide={wide} hidden={t.name === 'index' && !settings.habitsEnabled}>
                {t.label}
              </TabButton>
            </TabTrigger>
          ))}
        </Bar>
      </TabList>
      {wide ? <TabSlot style={styles.slot} /> : null}
    </Tabs>
  );
}

function Bar({ wide, children, ...props }: TabListProps & { wide: boolean }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  if (wide) {
    return (
      <View {...props} style={[styles.topBar, { backgroundColor: palette.paper, paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.topInner}>
          <View style={styles.brand}>
            <LogoMark size={28} />
            <Txt variant="label" style={styles.brandText}>
              Istel
            </Txt>
          </View>
          <View style={styles.topLinks}>
            {children}
            <View style={styles.brand}>
              <SettingsButton />
              <AccountButton />
            </View>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View {...props} pointerEvents="box-none" style={[styles.bottomWrap, { bottom: insets.bottom + Spacing.three }]}>
      <View style={[styles.pill, { backgroundColor: palette.ink }]}>{children}</View>
    </View>
  );
}

function TabButton({
  children,
  isFocused,
  icon,
  wide,
  hidden,
  ...props
}: TabTriggerSlotProps & { icon: TabIconName; wide: boolean; hidden?: boolean }) {
  const palette = usePalette();
  // Habits turned off: the Today tab stays routable but has no button.
  if (hidden) return null;
  if (wide) {
    return (
      <Pressable {...props} style={styles.topLink}>
        <Txt variant="label" tone={isFocused ? 'ink' : 'inkSoft'} style={styles.topLinkText}>
          {children}
        </Txt>
        <View style={[styles.underline, { backgroundColor: isFocused ? palette.ink : 'transparent' }]} />
      </Pressable>
    );
  }
  const color = isFocused ? palette.ink : palette.paper;
  return (
    <Pressable
      {...props}
      aria-label={String(children)}
      style={[styles.pillButton, isFocused && { backgroundColor: palette.paper }]}>
      <TabIcon name={icon} color={color} />
      {isFocused && (
        <Txt variant="label" tone="ink" style={styles.pillLabel}>
          {children}
        </Txt>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  topBar: { paddingHorizontal: Gutter, paddingBottom: Spacing.two },
  topInner: {
    width: '100%',
    maxWidth: MaxContentWidth + 200,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandText: { fontSize: 15 },
  topLinks: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five },
  topLink: { paddingVertical: Spacing.one, alignItems: 'center' },
  topLinkText: { fontSize: 14 },
  underline: { height: 2, alignSelf: 'stretch', marginTop: 3 },
  bottomWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: 6,
    borderRadius: Radius.pill,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
  },
  pillLabel: { fontSize: 14 },
});

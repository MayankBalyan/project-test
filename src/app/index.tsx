import { router } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { describeSchedule, HabitRow } from '@/components/habit-row';
import { Heading3D } from '@/components/heading-3d';
import { Hero } from '@/components/hero';
import { Blob, Planet } from '@/components/ink-art';
import { Island } from '@/components/island';
import { Card, InkButton, Screen, SectionTitle, Txt } from '@/components/ui';
import { Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { islandTier, unlocksFor } from '@/core/world';
import { usePalette } from '@/hooks/use-palette';
import { useRootline } from '@/state/store';

function formatToday(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export default function TodayScreen() {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const state = useRootline();
  const { global, habitStats, todayActivity, plants, lifetimeFocusMinutes } = state;
  const due = habitStats.filter((h) => h.scheduledToday);
  const doneCount = due.filter((h) => h.done).length;
  const contentWidth = Math.max(0, Math.min(width, MaxContentWidth) - Gutter * 2);

  return (
    <Screen>
      <Hero
        title={'Keep it\ngrowing'}
        subtitle={`${formatToday(state.today)} · day score ${todayActivity.score}`}
        art={
          <>
            <Blob size={170} variant={1} stars={22} style={styles.heroBlob} />
            <Planet size={150} style={styles.heroPlanet} />
          </>
        }
      />

      <View style={[styles.streakCard, { backgroundColor: palette.space }]}>
        <Blob size={160} variant={2} stars={16} style={styles.streakBlob} />
        <View>
          <Heading3D size={76} depth={6} face="#FFFFFF" ink="#5E5E5B">
            {String(global.current)}
          </Heading3D>
          <Txt variant="label" tone="face" style={styles.streakLabel}>
            Day streak
          </Txt>
        </View>
        <View style={styles.streakMeta}>
          <Txt variant="caption" style={styles.onSpace}>
            Longest · {global.longest} days
          </Txt>
          <Txt variant="caption" style={styles.onSpace}>
            Rain days · {global.rainDaysLeft}/3
          </Txt>
          <Txt variant="caption" style={styles.onSpace}>
            Focus today · {todayActivity.activity.focusMinutes} min
          </Txt>
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle
          right={
            <Txt variant="bodyBold">
              {doneCount}/{due.length}
            </Txt>
          }>
          Today&apos;s habits
        </SectionTitle>
        {due.map(({ habit, done, value, streak }) => (
          <HabitRow
            key={habit.id}
            name={habit.name}
            detail={
              habit.kind === 'count' ? `${value}/${habit.target} today · tap to add` : describeSchedule(habit.schedule)
            }
            done={done}
            progress={habit.kind === 'count' ? Math.min(1, value / habit.target) : undefined}
            streak={streak.current}
            streakUnit={habit.schedule.type === 'timesPerWeek' ? 'weeks' : 'days'}
            onToggle={() => state.toggleHabit(habit.id)}
          />
        ))}
      </View>

      <Card style={styles.focusCard}>
        <View style={styles.focusText}>
          <Txt variant="section">Plant a seed</Txt>
          <Txt variant="caption" tone="inkSoft">
            A 25-minute focus session plants a shrub on your island. Habits water it.
          </Txt>
        </View>
        <InkButton label="Start focus" onPress={() => router.navigate('/focus')} />
      </Card>

      <Pressable accessibilityLabel="Open your island" onPress={() => router.navigate('/island')} style={styles.section}>
        <SectionTitle right={<Txt variant="label">Open →</Txt>}>Your island</SectionTitle>
        <Island
          plants={plants}
          tier={islandTier(lifetimeFocusMinutes)}
          stars={20 + global.current * 2}
          unlocks={unlocksFor(global.longest)}
          width={contentWidth}
        />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBlob: { position: 'absolute', right: -60, top: -10 },
  heroPlanet: { position: 'absolute', right: -10, top: 30 },
  streakCard: {
    borderRadius: Radius.card + 8,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  streakBlob: { position: 'absolute', right: -40, top: -50, opacity: 0.9 },
  streakLabel: { fontSize: 15 },
  streakMeta: { alignItems: 'flex-end', gap: 4 },
  onSpace: { color: '#D8D7D2' },
  section: { gap: Spacing.two + 2 },
  focusCard: { gap: Spacing.three },
  focusText: { gap: Spacing.one },
});

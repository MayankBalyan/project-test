import { router } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AccountButton, SettingsButton } from '@/components/account-button';
import { describeSchedule, HabitRow } from '@/components/habit-row';
import { Heading3D } from '@/components/heading-3d';
import { Hero } from '@/components/hero';
import { Blob, LogoMark, Planet, RainDrop } from '@/components/ink-art';
import { Island } from '@/components/island';
import { Card, InkButton, Screen, SectionTitle, Txt } from '@/components/ui';
import { Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MAX_RAIN_DAYS, streakStatus } from '@/core/streaks';
import { islandTier, unlocksFor } from '@/core/world';
import { useIsWide, usePalette } from '@/hooks/use-palette';
import { useRootline } from '@/state/store';

function formatShort(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

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
  const wide = useIsWide();
  const { width } = useWindowDimensions();
  const state = useRootline();
  const { global, habitStats, todayActivity, plants, lifetimeFocusMinutes } = state;
  const due = habitStats.filter((h) => h.scheduledToday);
  const status = streakStatus(global, state.today);
  const doneCount = due.filter((h) => h.done).length;
  const contentWidth = Math.max(0, Math.min(width, MaxContentWidth) - Gutter * 2);

  return (
    <Screen>
      {!wide && (
        <View style={styles.topRow}>
          <View style={styles.brand}>
            <LogoMark size={24} />
            <Txt variant="label">Rootline</Txt>
          </View>
          <View style={styles.brand}>
            <SettingsButton />
            <AccountButton />
          </View>
        </View>
      )}
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
        <View style={styles.streakTop}>
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
              Best · {global.longest} days
            </Txt>
            <View style={styles.drops} aria-label={`${global.rainDaysLeft} of ${MAX_RAIN_DAYS} Rain Days saved`}>
              <Txt variant="caption" style={styles.onSpace}>
                Rain days
              </Txt>
              {Array.from({ length: MAX_RAIN_DAYS }, (_, i) => (
                <RainDrop key={i} size={14} filled={i < global.rainDaysLeft} color="#D8D7D2" />
              ))}
            </View>
            <Txt variant="caption" style={styles.onSpace}>
              Focus today · {todayActivity.activity.focusMinutes} min
            </Txt>
          </View>
        </View>
        <View style={styles.streakNote}>
          {status.rescuedOn ? (
            <>
              <RainDrop size={14} filled color="#FFFFFF" />
              <Txt variant="caption" tone="face" style={styles.noteText}>
                A Rain Day covered {formatShort(status.rescuedOn)} and kept your streak alive.
              </Txt>
            </>
          ) : (
            <Txt variant="caption" style={[styles.onSpace, styles.noteText]}>
              {status.restarting
                ? `Your best is ${global.longest} days. One habit or a 25-minute focus starts a new streak today.`
                : global.current === 0
                  ? 'One habit or a 25-minute focus starts your first streak.'
                  : `${status.daysToNext} ${status.daysToNext === 1 ? 'day' : 'days'} to your ${status.nextMilestone}-day milestone. Every 7 days earns a Rain Day.`}
            </Txt>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle
          right={
            due.length > 0 ? (
              <Txt variant="bodyBold">
                {doneCount}/{due.length}
              </Txt>
            ) : undefined
          }>
          Today&apos;s habits
        </SectionTitle>
        {habitStats.length === 0 ? (
          <Card style={styles.empty}>
            <Txt variant="section">No habits yet</Txt>
            <Txt variant="caption" tone="inkSoft">
              Start small. One habit you can do every day is enough to grow your first streak.
            </Txt>
            <InkButton label="Add your first habit" onPress={() => router.push('/habit/new')} />
          </Card>
        ) : (
          <>
            {due.length === 0 && (
              <Txt variant="caption" tone="inkSoft">
                Nothing due today. Enjoy the rest day.
              </Txt>
            )}
            {due.map(({ habit, done, value, streak }) => (
              <HabitRow
                key={habit.id}
                name={habit.name}
                detail={
                  (habit.kind === 'count'
                    ? `${value}/${habit.target} today · tap to add`
                    : describeSchedule(habit.schedule)) +
                  (habit.reminders?.length ? ` · reminds ${habit.reminders.join(', ')}` : '')
                }
                done={done}
                progress={habit.kind === 'count' ? Math.min(1, value / habit.target) : undefined}
                streak={streak.current}
                streakUnit={habit.schedule.type === 'timesPerWeek' ? 'weeks' : 'days'}
                onToggle={() => state.toggleHabit(habit.id)}
                onEdit={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
              />
            ))}
            <InkButton kind="outline" label="+ Add habit" onPress={() => router.push('/habit/new')} />
            <Txt variant="caption" tone="muted" style={styles.hint}>
              Tap to check off · long-press to edit
            </Txt>
          </>
        )}
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  heroBlob: { position: 'absolute', right: -60, top: -10 },
  heroPlanet: { position: 'absolute', right: -10, top: 30 },
  streakCard: {
    borderRadius: Radius.card + 8,
    padding: Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  streakTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  drops: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#3A3A38',
    paddingTop: Spacing.two + 2,
  },
  noteText: { flex: 1 },
  streakBlob: { position: 'absolute', right: -40, top: -50, opacity: 0.9 },
  streakLabel: { fontSize: 15 },
  streakMeta: { alignItems: 'flex-end', gap: 4 },
  onSpace: { color: '#D8D7D2' },
  section: { gap: Spacing.two + 2 },
  empty: { gap: Spacing.two + 2 },
  hint: { textAlign: 'center' },
  focusCard: { gap: Spacing.three },
  focusText: { gap: Spacing.one },
});

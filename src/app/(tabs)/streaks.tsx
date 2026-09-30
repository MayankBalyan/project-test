import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Heading3D } from '@/components/heading-3d';
import { TagBars, WeeklyFocusChart } from '@/components/focus-charts';
import { Heatmap } from '@/components/heatmap';
import { Hero } from '@/components/hero';
import { Blob, Moon } from '@/components/ink-art';
import { Card, Chip, Screen, SectionTitle, Txt } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { focusStats, formatMinutes } from '@/core/focus-stats';
import { HabitDay, habitHeatDays, habitSummary } from '@/core/habit-heat';
import { Habit } from '@/core/habits';
import { usePalette } from '@/hooks/use-palette';
import { useIstel } from '@/state/store';

function describeHabitDay(habit: Habit, d: HabitDay, today: string): string {
  const amount =
    habit.kind === 'count' ? ` · ${d.value}/${habit.target}` : habit.kind === 'duration' ? ` · ${d.value}/${habit.target} min` : '';
  if (d.done) return `Done${amount}`;
  if (d.muted) return 'Not due this day';
  if (d.date === today) return `Not done yet${amount}`;
  return d.value > 0 ? `Partly done${amount}` : 'Missed';
}

function formatDay(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function StreaksScreen() {
  const palette = usePalette();
  const { days, global, habitStats, habits, today, sessions, habitValues } = useIstel();
  const [heatHabit, setHeatHabit] = useState<string | null>(null);
  const chosen = heatHabit ? habitStats.find((h) => h.habit.id === heatHabit) : undefined;
  const chosenValues = chosen ? habitValues.get(chosen.habit.id) : undefined;
  const habitDays = useMemo(
    () => (chosen ? habitHeatDays(chosen.habit, chosenValues ?? new Map(), today) : null),
    [chosen, chosenValues, today],
  );
  const summary = chosen ? habitSummary(chosen.habit, chosenValues ?? new Map(), today) : null;
  const focus = useMemo(() => focusStats(sessions, today), [sessions, today]);
  const archived = habits.filter((h) => h.archivedAt);
  const edit = (id: string) => router.push({ pathname: '/habit/[id]', params: { id } });
  const [selected, setSelected] = useState(today);
  const day = days.find((d) => d.date === selected) ?? days[days.length - 1];
  const habitDay = habitDays?.find((d) => d.date === selected);
  const activeDays = days.filter((d) => d.score > 0).length;

  return (
    <Screen>
      <Hero
        title={'Your\nstreaks'}
        subtitle="Every square is a day. The stronger the ink, the more you showed up."
        art={
          <>
            <Blob size={150} variant={1} stars={20} style={styles.heroBlob} />
            <Moon size={64} style={styles.heroMoon} />
          </>
        }
      />

      <View style={styles.tiles}>
        <View style={[styles.bigTile, { backgroundColor: palette.space }]}>
          <Heading3D size={64} depth={5} face="#FFFFFF" ink="#5E5E5B">
            {String(global.current)}
          </Heading3D>
          <Txt variant="label" tone="face">
            Current streak
          </Txt>
        </View>
        <View style={styles.smallTiles}>
          {[
            [global.longest, 'Longest'],
            [global.rainDaysLeft, 'Rain days'],
            [activeDays, 'Active days'],
          ].map(([value, label]) => (
            <Card key={label} style={styles.smallTile}>
              <Txt style={[styles.tileValue, { color: palette.ink }]}>{value}</Txt>
              <Txt variant="caption" tone="inkSoft">
                {label}
              </Txt>
            </Card>
          ))}
        </View>
      </View>

      <Card style={styles.heatCard}>
        <SectionTitle right={<Txt variant="caption" tone="muted">Last 12 months</Txt>}>
          {chosen ? chosen.habit.name : 'All habits'}
        </SectionTitle>
        {habitStats.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All habits" selected={!chosen} onPress={() => setHeatHabit(null)} />
            {habitStats.map(({ habit }) => (
              <Chip key={habit.id} label={habit.name} selected={chosen?.habit.id === habit.id} onPress={() => setHeatHabit(habit.id)} />
            ))}
          </ScrollView>
        )}
        {chosen && summary && (
          <View style={styles.habitTiles}>
            {[
              [`${chosen.streak.current}`, chosen.habit.schedule.type === 'timesPerWeek' ? 'Week streak' : 'Day streak'],
              [`${chosen.streak.longest}`, 'Best'],
              [summary.rate30 === null ? '–' : `${Math.round(summary.rate30 * 100)}%`, 'Last 30 days'],
              [`${summary.totalDone}`, 'Days done'],
            ].map(([value, label]) => (
              <View key={label} style={[styles.habitTile, { borderColor: palette.line }]}>
                <Txt style={[styles.tileValue, { color: palette.ink }]}>{value}</Txt>
                <Txt variant="caption" tone="inkSoft">
                  {label}
                </Txt>
              </View>
            ))}
          </View>
        )}
        <Heatmap
          days={habitDays ?? days}
          rainDays={chosen ? [] : global.rainDaysUsedOn}
          selected={selected}
          onSelect={setSelected}
        />
        <View style={[styles.dayDetail, { borderColor: palette.line }]}>
          <Txt variant="bodyBold">{formatDay(selected)}</Txt>
          <Txt variant="caption" tone="inkSoft">
            {chosen && habitDay
              ? describeHabitDay(chosen.habit, habitDay, today)
              : `Score ${day.score} · ${day.activity.habitsCompleted}/${day.activity.habitsScheduled} habits · ${day.activity.focusMinutes} min focus${global.rainDaysUsedOn.includes(day.date) ? ' · a Rain Day kept the streak' : ''}`}
          </Txt>
        </View>
      </Card>

      <View style={styles.list}>
        <SectionTitle>Focus</SectionTitle>
        <View style={styles.focusTiles}>
          {[
            [formatMinutes(focus.totals.today), 'Today'],
            [formatMinutes(focus.totals.week), 'This week'],
            [formatMinutes(focus.totals.month), 'Last 30 days'],
            [focus.completionRate === null ? '–' : `${Math.round(focus.completionRate * 100)}%`, 'Finished'],
          ].map(([value, label]) => (
            <Card key={label} style={styles.focusTile}>
              <Txt style={[styles.tileValue, { color: palette.ink }]}>{value}</Txt>
              <Txt variant="caption" tone="inkSoft">
                {label}
              </Txt>
            </Card>
          ))}
        </View>
      </View>

      <Card style={styles.heatCard}>
        <SectionTitle>Last 12 weeks</SectionTitle>
        <WeeklyFocusChart weeks={focus.weeks} />
      </Card>

      <Card style={styles.heatCard}>
        <SectionTitle>By tag · 30 days</SectionTitle>
        <TagBars byTag={focus.byTag} />
      </Card>

      <View style={styles.list}>
        <SectionTitle>By habit</SectionTitle>
        {habitStats.length === 0 && (
          <Txt variant="caption" tone="inkSoft">
            Add a habit on Today to see its streak here.
          </Txt>
        )}
        {habitStats.map(({ habit, streak }) => {
          const unit = habit.schedule.type === 'timesPerWeek' ? 'wk' : 'd';
          return (
            <Pressable
              key={habit.id}
              role="button"
              accessibilityLabel={`Edit ${habit.name}`}
              onPress={() => edit(habit.id)}
              style={[styles.habitRow, { borderColor: palette.line }]}>
              <Txt variant="label" style={styles.habitName}>
                {habit.name}
              </Txt>
              <Txt variant="caption" tone="inkSoft">
                now {streak.current}
                {unit} · best {streak.longest}
                {unit} · edit →
              </Txt>
            </Pressable>
          );
        })}
        {archived.length > 0 && (
          <>
            <Txt variant="label" tone="muted" style={styles.archivedTitle}>
              Archived
            </Txt>
            {archived.map((h) => (
              <Pressable
                key={h.id}
                role="button"
                accessibilityLabel={`Edit archived habit ${h.name}`}
                onPress={() => edit(h.id)}
                style={[styles.habitRow, { borderColor: palette.line }]}>
                <Txt variant="label" tone="muted" style={styles.habitName}>
                  {h.name}
                </Txt>
                <Txt variant="caption" tone="muted">
                  restore →
                </Txt>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBlob: { position: 'absolute', right: -50, top: 0 },
  heroMoon: { position: 'absolute', right: 100, top: 20 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bigTile: {
    flexGrow: 1,
    flexBasis: 180,
    borderRadius: Radius.card,
    padding: Spacing.three,
    justifyContent: 'flex-end',
  },
  smallTiles: { flexGrow: 1, flexBasis: 160, gap: Spacing.two },
  smallTile: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingVertical: 8,
    borderRadius: Radius.card - 6,
  },
  tileValue: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 32 },
  heatCard: { gap: Spacing.three },
  chips: { gap: Spacing.two, paddingRight: Spacing.two },
  habitTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  habitTile: {
    flexGrow: 1,
    flexBasis: 120,
    borderWidth: 1,
    borderRadius: Radius.card - 8,
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
  },
  focusTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  focusTile: { flexGrow: 1, flexBasis: 140, gap: 2, paddingVertical: 10, borderRadius: Radius.card - 6 },
  dayDetail: { borderTopWidth: 1, paddingTop: Spacing.two + 2, gap: 2 },
  list: { gap: Spacing.one },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  habitName: { fontSize: 16, flexShrink: 1 },
  archivedTitle: { marginTop: Spacing.three },
});

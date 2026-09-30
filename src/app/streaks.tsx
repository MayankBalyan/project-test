import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Heading3D } from '@/components/heading-3d';
import { Heatmap } from '@/components/heatmap';
import { Hero } from '@/components/hero';
import { Blob, Moon } from '@/components/ink-art';
import { Card, Screen, SectionTitle, Txt } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useRootline } from '@/state/store';

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
  const { days, global, habitStats, today } = useRootline();
  const [selected, setSelected] = useState(today);
  const day = days.find((d) => d.date === selected) ?? days[days.length - 1];
  const activeDays = days.filter((d) => d.score > 0).length;

  return (
    <Screen>
      <Hero
        title={'Your\nstreaks'}
        subtitle="Every square is a day. The darker the ink, the more you showed up."
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
        <SectionTitle>Last 12 months</SectionTitle>
        <Heatmap days={days} selected={selected} onSelect={setSelected} />
        <View style={[styles.dayDetail, { borderColor: palette.line }]}>
          <Txt variant="bodyBold">{formatDay(day.date)}</Txt>
          <Txt variant="caption" tone="inkSoft">
            Score {day.score} · {day.activity.habitsCompleted}/{day.activity.habitsScheduled} habits ·{' '}
            {day.activity.focusMinutes} min focus
          </Txt>
        </View>
      </Card>

      <View style={styles.list}>
        <SectionTitle>By habit</SectionTitle>
        {habitStats.map(({ habit, streak }) => {
          const unit = habit.schedule.type === 'timesPerWeek' ? 'wk' : 'd';
          return (
            <View key={habit.id} style={[styles.habitRow, { borderColor: palette.line }]}>
              <Txt variant="label" style={styles.habitName}>
                {habit.name}
              </Txt>
              <Txt variant="caption" tone="inkSoft">
                now {streak.current}
                {unit} · best {streak.longest}
                {unit}
              </Txt>
            </View>
          );
        })}
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
  dayDetail: { borderTopWidth: 1, paddingTop: Spacing.two + 2, gap: 2 },
  list: { gap: Spacing.one },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  habitName: { fontSize: 16 },
});

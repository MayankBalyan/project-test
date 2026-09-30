import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LocalDate, weekday } from '@/core/dates';
import { heatLevel } from '@/core/score';
import { usePalette } from '@/hooks/use-palette';

import { Txt } from './ui';

const CELL = 12;
const GAP = 3;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type HeatDay = { date: LocalDate; score: number };

/** GitHub-style contribution grid: one column per week (Mon–Sun), ink intensity = daily score. */
export function Heatmap({
  days,
  selected,
  onSelect,
}: {
  days: HeatDay[];
  selected?: LocalDate;
  onSelect: (date: LocalDate) => void;
}) {
  const palette = usePalette();
  const scroll = useRef<ScrollView>(null);
  if (days.length === 0) return null;

  // Pad the start so the first column begins on a Monday.
  const lead = (weekday(days[0].date) + 6) % 7;
  const cells: (HeatDay | null)[] = [...Array(lead).fill(null), ...days];
  const weeks: (HeatDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.weekdays}>
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, i) => (
            <Txt key={i} variant="caption" tone="muted" style={styles.weekdayLabel}>
              {d}
            </Txt>
          ))}
        </View>
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          <View>
            <View style={styles.months}>
              {weeks.map((week, i) => {
                const first = week.find(Boolean);
                const showMonth = first && Number(first.date.slice(8)) <= 7;
                return (
                  <View key={i} style={styles.monthSlot}>
                    {showMonth && (
                      <Txt variant="caption" tone="muted" style={styles.monthLabel}>
                        {MONTHS[Number(first.date.slice(5, 7)) - 1]}
                      </Txt>
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.grid}>
              {weeks.map((week, wi) => (
                <View key={wi} style={styles.column}>
                  {week.map((day, di) =>
                    day ? (
                      <Pressable
                        key={day.date}
                        accessibilityLabel={`${day.date}: score ${day.score}`}
                        onPress={() => onSelect(day.date)}
                        onHoverIn={() => onSelect(day.date)}
                        hitSlop={1}
                        style={[
                          styles.cell,
                          { backgroundColor: palette.heat[heatLevel(day.score)] },
                          day.date === selected && { borderWidth: 2, borderColor: palette.ink, transform: [{ scale: 1.25 }] },
                        ]}
                      />
                    ) : (
                      <View key={`pad${di}`} style={styles.cell} />
                    ),
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
      <View style={styles.legend}>
        <Txt variant="caption" tone="muted">
          Less
        </Txt>
        {palette.heat.map((c) => (
          <View key={c} style={[styles.cell, { backgroundColor: c }]} />
        ))}
        <Txt variant="caption" tone="muted">
          More
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  weekdays: { marginTop: 18, marginRight: 6, gap: GAP },
  weekdayLabel: { height: CELL, lineHeight: CELL, fontSize: 9 },
  months: { flexDirection: 'row', gap: GAP, height: 18 },
  monthSlot: { width: CELL },
  monthLabel: { position: 'absolute', width: 40, fontSize: 10 },
  grid: { flexDirection: 'row', gap: GAP },
  column: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10 },
});

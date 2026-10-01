import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { daysBetween, LocalDate } from '@/core/dates';
import { formatTime, parseTime } from '@/core/habit-input';
import { describeDay, monthGrid, quickDueDates } from '@/core/todos';
import { usePalette } from '@/hooks/use-palette';

import { Chip, Stepper, Toggle, Txt } from './ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DEFAULT_TIME = '18:00';

/** Month calendar in ink: Monday first, today outlined, the chosen day filled, past days dimmed. */
function MonthCalendar({ today, value, onPick }: { today: LocalDate; value?: LocalDate; onPick: (date: LocalDate) => void }) {
  const palette = usePalette();
  const start = value ?? today;
  const [view, setView] = useState({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) });
  const shift = (by: number) =>
    setView(({ year, month }) => {
      const m = month - 1 + by;
      return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 + 1 };
    });
  const cells = monthGrid(view.year, view.month);
  const atThisMonth = view.year === Number(today.slice(0, 4)) && view.month === Number(today.slice(5, 7));

  return (
    <View style={styles.calendar}>
      <View style={styles.calHead}>
        <Pressable role="button" aria-label="Previous month" disabled={atThisMonth} onPress={() => shift(-1)} hitSlop={10}>
          <Txt variant="label" style={{ opacity: atThisMonth ? 0.3 : 1 }}>
            ‹ Prev
          </Txt>
        </Pressable>
        <Txt variant="label">
          {MONTHS[view.month - 1]} {view.year}
        </Txt>
        <Pressable role="button" aria-label="Next month" onPress={() => shift(1)} hitSlop={10}>
          <Txt variant="label">Next ›</Txt>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEK.map((d, i) => (
          <View key={`h${i}`} style={styles.cell}>
            <Txt variant="caption" tone="muted">
              {d}
            </Txt>
          </View>
        ))}
        {cells.map((date, i) => {
          if (!date) return <View key={`e${i}`} style={styles.cell} />;
          const past = daysBetween(today, date) < 0;
          const selected = date === value;
          const isToday = date === today;
          return (
            <View key={date} style={styles.cell}>
              <Pressable
                role="button"
                aria-label={describeDay(date, today)}
                aria-selected={selected}
                disabled={past}
                onPress={() => onPick(date)}
                style={[
                  styles.day,
                  {
                    backgroundColor: selected ? palette.ink : 'transparent',
                    borderColor: isToday || selected ? palette.ink : 'transparent',
                    opacity: past ? 0.3 : 1,
                  },
                ]}>
                <Txt variant="label" tone={selected ? 'paper' : 'ink'}>
                  {Number(date.slice(8))}
                </Txt>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Picks a deadline: none, a quick choice (today, tomorrow, the weekend, next week) or any day from a calendar,
 * plus an optional time.
 */
export function DuePicker({
  today,
  date,
  time,
  onChange,
}: {
  today: LocalDate;
  date?: LocalDate;
  time?: string;
  onChange: (date: LocalDate | undefined, time: string | undefined) => void;
}) {
  const quick = quickDueDates(today);
  const isQuick = !!date && quick.some((q) => q.date === date);
  const [calendar, setCalendar] = useState(!!date && !isQuick);
  const { hour, minute } = parseTime(time ?? DEFAULT_TIME);

  return (
    <View style={styles.picker}>
      <View style={styles.chips}>
        <Chip
          label="No deadline"
          selected={!date}
          onPress={() => {
            setCalendar(false);
            onChange(undefined, undefined);
          }}
        />
        {quick.map((q) => (
          <Chip
            key={q.label}
            label={q.label}
            selected={date === q.date && !calendar}
            onPress={() => {
              setCalendar(false);
              onChange(q.date, time);
            }}
          />
        ))}
        <Chip label="Pick a day" selected={calendar} onPress={() => setCalendar((c) => !c)} />
      </View>
      {calendar && <MonthCalendar today={today} value={date} onPick={(d) => onChange(d, time)} />}
      {date && (
        <>
          <Toggle
            label="At a set time"
            detail={time ? undefined : 'Without a time, it’s due by the end of the day.'}
            value={!!time}
            onChange={(on) => onChange(date, on ? DEFAULT_TIME : undefined)}
          />
          {time && (
            <View style={styles.time}>
              <Stepper
                label="deadline hour"
                value={hour}
                min={0}
                max={23}
                format={(v) => String(v).padStart(2, '0')}
                onChange={(h) => onChange(date, formatTime(h, minute))}
                compact
              />
              <Txt variant="section">:</Txt>
              <Stepper
                label="deadline minutes"
                value={minute}
                min={0}
                max={55}
                step={5}
                format={(v) => String(v).padStart(2, '0')}
                onChange={(m) => onChange(date, formatTime(hour, m))}
                compact
              />
            </View>
          )}
          <Txt variant="caption" tone="inkSoft" role="status">
            Due {dayInSentence(date, today)}
            {time ? ` at ${time}` : ''}
          </Txt>
        </>
      )}
    </View>
  );
}

/** "today", "tomorrow", "Fri 17 Oct": a day label that reads well mid-sentence. */
function dayInSentence(date: LocalDate, today: LocalDate) {
  const label = describeDay(date, today);
  return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : label;
}

const CELL = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  picker: { gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  calendar: { gap: Spacing.two },
  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: '84%',
    height: '84%',
    maxWidth: 44,
    maxHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});

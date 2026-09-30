import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { LocalDate } from '@/core/dates';
import { HABIT_NAME_MAX, HabitInput, LIMITS, validateHabit } from '@/core/habit-input';
import { HabitKind, Schedule } from '@/core/habits';
import { usePalette } from '@/hooks/use-palette';

import { Heading3D } from './heading-3d';
import { Blob } from './ink-art';
import { Card, Chip, InkButton, Screen, Stepper, TextField, Txt } from './ui';

type ScheduleType = Schedule['type'];

const SCHEDULE_OPTIONS: { type: ScheduleType; label: string }[] = [
  { type: 'daily', label: 'Every day' },
  { type: 'weekdays', label: 'Some days' },
  { type: 'timesPerWeek', label: 'X a week' },
  { type: 'everyNDays', label: 'Every N days' },
];

// Monday first; values are JS weekday numbers (0 = Sunday).
const WEEK = [
  { day: 1, short: 'M', name: 'Monday' },
  { day: 2, short: 'T', name: 'Tuesday' },
  { day: 3, short: 'W', name: 'Wednesday' },
  { day: 4, short: 'T', name: 'Thursday' },
  { day: 5, short: 'F', name: 'Friday' },
  { day: 6, short: 'S', name: 'Saturday' },
  { day: 0, short: 'S', name: 'Sunday' },
];

function DayToggle({ short, name, on, onPress }: { short: string; name: string; on: boolean; onPress: () => void }) {
  const palette = usePalette();
  return (
    <Pressable
      role="checkbox"
      aria-checked={on}
      aria-label={name}
      onPress={onPress}
      style={[styles.day, { borderColor: palette.ink, backgroundColor: on ? palette.ink : 'transparent' }]}>
      <Txt variant="label" tone={on ? 'paper' : 'ink'}>
        {short}
      </Txt>
    </Pressable>
  );
}

export function HabitForm({
  title,
  initial,
  today,
  submitLabel,
  onSubmit,
  children,
}: {
  title: string;
  initial?: HabitInput;
  today: LocalDate;
  submitLabel: string;
  onSubmit: (input: HabitInput) => void;
  /** Extra actions under the form, e.g. archive and delete. */
  children?: ReactNode;
}) {
  const s = initial?.schedule;
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<HabitKind>(initial?.kind ?? 'check');
  const [target, setTarget] = useState(initial && initial.kind === 'count' ? initial.target : 8);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(s?.type ?? 'daily');
  const [days, setDays] = useState<number[]>(s?.type === 'weekdays' ? s.days : [1, 2, 3, 4, 5]);
  const [times, setTimes] = useState(s?.type === 'timesPerWeek' ? s.times : 3);
  const [everyN, setEveryN] = useState(s?.type === 'everyNDays' ? s.n : 2);
  const [error, setError] = useState<string | null>(null);

  const schedule = (): Schedule => {
    switch (scheduleType) {
      case 'daily':
        return { type: 'daily' };
      case 'weekdays':
        return { type: 'weekdays', days };
      case 'timesPerWeek':
        return { type: 'timesPerWeek', times };
      case 'everyNDays':
        return { type: 'everyNDays', n: everyN, anchor: s?.type === 'everyNDays' ? s.anchor : today };
    }
  };

  const submit = () => {
    const input: HabitInput = { name, kind, target: kind === 'count' ? target : 1, schedule: schedule() };
    const problem = validateHabit(input);
    setError(problem);
    if (!problem) onSubmit(input);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen>
      <View style={styles.header}>
        <Blob size={120} variant={2} stars={14} style={styles.blob} />
        <Pressable role="button" onPress={close} hitSlop={12} style={styles.close}>
          <Txt variant="label">← Back</Txt>
        </Pressable>
        <Heading3D size={54} depth={6}>
          {title}
        </Heading3D>
      </View>

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Read 20 pages"
        maxLength={HABIT_NAME_MAX}
        autoFocus={!initial}
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          How do you track it?
        </Txt>
        <View style={styles.row}>
          <Chip label="Done / not done" selected={kind === 'check'} onPress={() => setKind('check')} />
          <Chip label="Count" selected={kind === 'count'} onPress={() => setKind('count')} />
        </View>
        {kind === 'count' && (
          <Stepper
            label="daily goal"
            value={target}
            min={LIMITS.countTarget.min}
            max={LIMITS.countTarget.max}
            unit="times a day"
            onChange={setTarget}
          />
        )}
      </Card>

      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          When?
        </Txt>
        <View style={styles.row}>
          {SCHEDULE_OPTIONS.map((o) => (
            <Chip key={o.type} label={o.label} selected={scheduleType === o.type} onPress={() => setScheduleType(o.type)} />
          ))}
        </View>
        {scheduleType === 'weekdays' && (
          <View style={styles.days}>
            {WEEK.map((d) => (
              <DayToggle
                key={d.day}
                short={d.short}
                name={d.name}
                on={days.includes(d.day)}
                onPress={() => setDays((prev) => (prev.includes(d.day) ? prev.filter((x) => x !== d.day) : [...prev, d.day]))}
              />
            ))}
          </View>
        )}
        {scheduleType === 'timesPerWeek' && (
          <Stepper
            label="times per week"
            value={times}
            min={LIMITS.timesPerWeek.min}
            max={LIMITS.timesPerWeek.max}
            unit="times a week, any days"
            onChange={setTimes}
          />
        )}
        {scheduleType === 'everyNDays' && (
          <Stepper
            label="repeat interval"
            value={everyN}
            min={LIMITS.everyNDays.min}
            max={LIMITS.everyNDays.max}
            unit="days between, starting today"
            onChange={setEveryN}
          />
        )}
      </Card>

      {error && (
        <Txt variant="bodyBold" role="alert">
          ✦ {error}
        </Txt>
      )}

      <InkButton label={submitLabel} onPress={submit} />
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, paddingTop: Spacing.two },
  blob: { position: 'absolute', right: -40, top: -20 },
  close: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  group: { gap: Spacing.three },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

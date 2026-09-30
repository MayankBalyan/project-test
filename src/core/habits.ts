import { addDays, daysBetween, LocalDate, weekday } from './dates';

export type HabitKind = 'check' | 'count' | 'duration';

export type Schedule =
  | { type: 'daily' }
  /** 0 = Sunday … 6 = Saturday */
  | { type: 'weekdays'; days: number[] }
  | { type: 'everyNDays'; n: number; anchor: LocalDate }
  | { type: 'timesPerWeek'; times: number };

export interface Habit {
  id: string;
  kind: HabitKind;
  /** 1 for check habits; the goal amount for count/duration habits. */
  target: number;
  schedule: Schedule;
  createdOn: LocalDate;
}

export interface HabitEvent {
  id: string;
  habitId: string;
  date: LocalDate;
  type: 'complete' | 'undo';
  value: number;
  createdAt: number;
}

/**
 * Folds the event log into a value per day. Events are de-duplicated by id so the same
 * event synced from several devices is only counted once.
 */
export function dailyValues(events: HabitEvent[]): Map<LocalDate, number> {
  const seen = new Set<string>();
  const totals = new Map<LocalDate, number>();
  const ordered = [...events].sort((a, b) => a.createdAt - b.createdAt);
  for (const e of ordered) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const current = totals.get(e.date) ?? 0;
    totals.set(e.date, Math.max(0, current + (e.type === 'complete' ? e.value : -e.value)));
  }
  return totals;
}

export function isScheduledOn(schedule: Schedule, date: LocalDate): boolean {
  switch (schedule.type) {
    case 'daily':
    case 'timesPerWeek':
      return true;
    case 'weekdays':
      return schedule.days.includes(weekday(date));
    case 'everyNDays': {
      const diff = daysBetween(schedule.anchor, date);
      return diff >= 0 && diff % schedule.n === 0;
    }
  }
}

export function isDoneOn(habit: Habit, values: Map<LocalDate, number>, date: LocalDate): boolean {
  return (values.get(date) ?? 0) >= habit.target;
}

/** Monday of the week containing `date`. */
export function weekStart(date: LocalDate): LocalDate {
  return addDays(date, -((weekday(date) + 6) % 7));
}

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * Streak in scheduled periods: days for day-based schedules, weeks for `timesPerWeek`.
 * Unscheduled days never break a streak, and the period containing `today` only counts
 * once it is completed — it never breaks the streak while still in progress.
 */
export function habitStreak(habit: Habit, events: HabitEvent[], today: LocalDate): StreakResult {
  const values = dailyValues(events);
  if (habit.schedule.type === 'timesPerWeek') {
    return weeklyStreak(habit, habit.schedule.times, values, today);
  }

  let longest = 0;
  let run = 0;
  for (let d = habit.createdOn; daysBetween(d, today) >= 0; d = addDays(d, 1)) {
    if (!isScheduledOn(habit.schedule, d)) continue;
    if (isDoneOn(habit, values, d)) {
      run++;
    } else if (d !== today) {
      run = 0;
    }
    longest = Math.max(longest, run);
  }
  return { current: run, longest };
}

function weeklyStreak(
  habit: Habit,
  times: number,
  values: Map<LocalDate, number>,
  today: LocalDate,
): StreakResult {
  const thisWeek = weekStart(today);
  let run = 0;
  let longest = 0;
  for (let w = weekStart(habit.createdOn); daysBetween(w, thisWeek) >= 0; w = addDays(w, 7)) {
    let doneDays = 0;
    for (let i = 0; i < 7; i++) {
      if (isDoneOn(habit, values, addDays(w, i))) doneDays++;
    }
    if (doneDays >= times) {
      run++;
    } else if (w !== thisWeek) {
      run = 0;
    }
    longest = Math.max(longest, run);
  }
  return { current: run, longest };
}

import { addDays, daysBetween, LocalDate } from './dates';
import { Habit, isScheduledOn, weekStart } from './habits';

export interface HabitDay {
  date: LocalDate;
  /** 0–100: 100 when the day's goal was met, a share of it for counts and minutes. */
  score: number;
  value: number;
  /** Not something this habit asked for that day (unscheduled, or before the habit existed). */
  muted: boolean;
  done: boolean;
}

/**
 * One habit's last `days` days for its own heatmap. Days the habit wasn't due and had nothing logged are
 * muted, so a Mon/Wed/Fri habit doesn't look like it missed every Tuesday.
 */
export function habitHeatDays(
  habit: Habit,
  values: Map<LocalDate, number>,
  today: LocalDate,
  days = 365,
): HabitDay[] {
  const out: HabitDay[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const date = addDays(today, -back);
    const value = values.get(date) ?? 0;
    const existed = daysBetween(habit.createdOn, date) >= 0;
    const due = habit.schedule.type === 'timesPerWeek' || isScheduledOn(habit.schedule, date);
    const done = value >= habit.target;
    const score = done ? 100 : Math.round((Math.min(value, habit.target) / habit.target) * 100);
    out.push({ date, score, value, done, muted: value === 0 && (!existed || !due) });
  }
  return out;
}

export interface HabitSummary {
  /** Share of due days (or weeks, for "X times a week") met in the last 30 days; null if none were due yet. */
  rate30: number | null;
  /** Days the goal was met, ever. */
  totalDone: number;
}

export function habitSummary(habit: Habit, values: Map<LocalDate, number>, today: LocalDate): HabitSummary {
  let totalDone = 0;
  for (const [, v] of values) if (v >= habit.target) totalDone++;

  const start = daysBetween(habit.createdOn, addDays(today, -29)) > 0 ? addDays(today, -29) : habit.createdOn;
  const doneOn = (d: LocalDate) => (values.get(d) ?? 0) >= habit.target;

  if (habit.schedule.type === 'timesPerWeek') {
    // Whole weeks that have ended, plus this week once it's already met.
    const times = habit.schedule.times;
    let weeks = 0;
    let met = 0;
    for (let w = weekStart(start); daysBetween(w, today) >= 0; w = addDays(w, 7)) {
      let count = 0;
      for (let i = 0; i < 7; i++) if (doneOn(addDays(w, i))) count++;
      const ended = daysBetween(addDays(w, 6), today) > 0;
      if (ended || count >= times) {
        weeks++;
        if (count >= times) met++;
      }
    }
    return { rate30: weeks ? met / weeks : null, totalDone };
  }

  let due = 0;
  let met = 0;
  for (let d = start; daysBetween(d, today) >= 0; d = addDays(d, 1)) {
    if (!isScheduledOn(habit.schedule, d)) continue;
    // Today only counts once it's done; it isn't missed yet.
    if (d === today && !doneOn(d)) continue;
    due++;
    if (doneOn(d)) met++;
  }
  return { rate30: due ? met / due : null, totalDone };
}

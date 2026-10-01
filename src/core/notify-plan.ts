import { addDays, DayConfig, daysBetween, LocalDate, toLocalDate } from './dates';
import { parseTime } from './habit-input';
import { isScheduledOn, Schedule } from './habits';

export interface PlannedNotification {
  id: string;
  kind: 'habit' | 'streak' | 'focus' | 'todo';
  /** Epoch milliseconds. */
  at: number;
  title: string;
  body: string;
}

export interface PlanInput {
  now: number;
  today: LocalDate;
  dayConfig: DayConfig;
  habits: {
    id: string;
    name: string;
    schedule: Schedule;
    createdOn: LocalDate;
    reminders?: string[];
    archivedAt?: number;
  }[];
  /** Habits already done today; their reminders for today are skipped. */
  doneToday: Set<string>;
  /** Whether today already has a qualifying action (a habit, or a 25+ minute session). */
  qualifiedToday: boolean;
  currentStreak: number;
  streakAtRisk: { enabled: boolean; hour: number };
  focusEnd: { enabled: boolean; at: number | null };
  /** Open to-dos with a deadline: a reminder at the deadline time, or at 9:00 on the day without one. */
  todos?: { id: string; title: string; dueDate?: LocalDate; dueTime?: string; doneAt?: number }[];
  /** Turns a calendar date and wall-clock time on this device into an instant. */
  toInstant?: (date: LocalDate, hour: number, minute: number) => number;
  /** How many days ahead to schedule. Reminders stop if the app isn't opened for this long. */
  days?: number;
  /** iOS keeps at most 64 pending notifications per app. */
  max?: number;
}

export const PLAN_DAYS = 14;
export const PLAN_MAX = 60;
/** To-dos without a time are mentioned in the morning of their day. */
export const TODO_DAY_REMINDER_HOUR = 9;

function deviceInstant(date: LocalDate, hour: number, minute: number): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute).getTime();
}

/**
 * Everything Istel should notify about, as one-off notifications over the next `days` days.
 * One-off (not repeating) notifications let us skip reminders for habits already done today;
 * the app re-plans whenever something changes and each time it opens.
 */
export function planNotifications(input: PlanInput): PlannedNotification[] {
  const toInstant = input.toInstant ?? deviceInstant;
  const days = input.days ?? PLAN_DAYS;
  const out: PlannedNotification[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(input.today, i);

    for (const h of input.habits) {
      if (h.archivedAt || !h.reminders?.length) continue;
      if (daysBetween(h.createdOn, date) < 0 || !isScheduledOn(h.schedule, date)) continue;
      for (const time of h.reminders) {
        const { hour, minute } = parseTime(time);
        const at = toInstant(date, hour, minute);
        if (at <= input.now) continue;
        const day = toLocalDate(new Date(at), input.dayConfig);
        if (day === input.today && input.doneToday.has(h.id)) continue;
        out.push({ id: `habit:${h.id}:${date}:${time}`, kind: 'habit', at, title: h.name, body: 'Time for this one. Tap to check it off.' });
      }
    }

    if (input.streakAtRisk.enabled && !(i === 0 && input.qualifiedToday)) {
      const at = toInstant(date, input.streakAtRisk.hour, 0);
      if (at > input.now) {
        const streak = i === 0 ? input.currentStreak : 0;
        out.push({
          id: `streak:${date}`,
          kind: 'streak',
          at,
          title: streak > 0 ? `Your ${streak}-day streak is at risk` : 'Keep your planet growing',
          body: 'One habit or a 25-minute focus session keeps your streak alive today.',
        });
      }
    }
  }

  const lastDay = addDays(input.today, days - 1);
  for (const t of input.todos ?? []) {
    if (t.doneAt || !t.dueDate || daysBetween(t.dueDate, lastDay) < 0) continue;
    const { hour, minute } = t.dueTime ? parseTime(t.dueTime) : { hour: TODO_DAY_REMINDER_HOUR, minute: 0 };
    const at = toInstant(t.dueDate, hour, minute);
    if (at <= input.now) continue;
    out.push({
      id: `todo:${t.id}:${t.dueDate}:${t.dueTime ?? ''}`,
      kind: 'todo',
      at,
      title: t.title,
      body: t.dueTime ? 'Due now.' : 'Due today.',
    });
  }

  if (input.focusEnd.enabled && input.focusEnd.at && input.focusEnd.at > input.now) {
    out.push({
      id: 'focus:end',
      kind: 'focus',
      at: input.focusEnd.at,
      title: 'Focus session complete',
      body: 'A new moon just joined your planet.',
    });
  }

  return out.sort((a, b) => a.at - b.at).slice(0, input.max ?? PLAN_MAX);
}

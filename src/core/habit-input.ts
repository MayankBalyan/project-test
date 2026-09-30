import { HabitKind, Schedule } from './habits';

export const HABIT_NAME_MAX = 40;

export interface HabitInput {
  name: string;
  kind: HabitKind;
  target: number;
  schedule: Schedule;
  /** Reminder times as "HH:MM" (24-hour), at most MAX_REMINDERS. */
  reminders?: string[];
}

export const MAX_REMINDERS = 3;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const LIMITS = {
  countTarget: { min: 2, max: 99 },
  timesPerWeek: { min: 1, max: 6 },
  everyNDays: { min: 2, max: 30 },
} as const;

/** Returns a message for the first problem found, or null when the habit can be saved. */
export function validateHabit(input: HabitInput): string | null {
  const name = input.name.trim();
  if (!name) return 'Give your habit a name.';
  if (name.length > HABIT_NAME_MAX) return `Keep the name under ${HABIT_NAME_MAX} characters.`;
  if (input.kind === 'count') {
    const { min, max } = LIMITS.countTarget;
    if (!Number.isInteger(input.target) || input.target < min || input.target > max) {
      return `Daily goal must be between ${min} and ${max}.`;
    }
  }
  const s = input.schedule;
  if (s.type === 'weekdays' && s.days.length === 0) return 'Pick at least one day.';
  if (s.type === 'timesPerWeek' && (s.times < LIMITS.timesPerWeek.min || s.times > LIMITS.timesPerWeek.max)) {
    return `Times per week must be between ${LIMITS.timesPerWeek.min} and ${LIMITS.timesPerWeek.max}.`;
  }
  if (s.type === 'everyNDays' && (s.n < LIMITS.everyNDays.min || s.n > LIMITS.everyNDays.max)) {
    return `Repeat every ${LIMITS.everyNDays.min}–${LIMITS.everyNDays.max} days.`;
  }
  const reminders = input.reminders ?? [];
  if (reminders.length > MAX_REMINDERS) return `Up to ${MAX_REMINDERS} reminders per habit.`;
  if (reminders.some((t) => !TIME.test(t))) return 'Reminder times must look like 08:30.';
  return null;
}

/** Trims the name, forces check habits to a target of 1, and sorts weekdays and reminder times. */
export function normalizeHabit(input: HabitInput): HabitInput {
  const schedule: Schedule =
    input.schedule.type === 'weekdays'
      ? { type: 'weekdays', days: [...new Set(input.schedule.days)].sort((a, b) => a - b) }
      : input.schedule;
  return {
    name: input.name.trim(),
    kind: input.kind,
    target: input.kind === 'check' ? 1 : input.target,
    schedule,
    reminders: [...new Set(input.reminders ?? [])].sort(),
  };
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

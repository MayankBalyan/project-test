/**
 * A calendar day in the user's home time zone, formatted as YYYY-MM-DD.
 * A "day" ends at `dayStartHour` (default 04:00), so late-night activity counts toward the previous day.
 */
export type LocalDate = string;

export interface DayConfig {
  timeZone: string;
  dayStartHour: number;
}

export const DEFAULT_DAY_START_HOUR = 4;

export function toLocalDate(instant: Date, { timeZone, dayStartHour }: DayConfig): LocalDate {
  const shifted = new Date(instant.getTime() - dayStartHour * 60 * 60 * 1000);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}

function toUtcMidnight(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date(toUtcMidnight(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Number of days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMidnight(b) - toUtcMidnight(a)) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: LocalDate): number {
  return new Date(toUtcMidnight(date)).getUTCDay();
}

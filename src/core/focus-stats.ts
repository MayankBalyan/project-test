import { addDays, daysBetween, LocalDate } from './dates';
import { weekStart } from './habits';

export interface SessionLike {
  date: LocalDate;
  minutes: number;
  status: 'done' | 'given_up';
  tag: string;
}

export interface FocusStats {
  /** Oldest first, one entry per week (Monday start), ending with the current week. */
  weeks: { start: LocalDate; minutes: number; sessions: number }[];
  /** Tags over the last 30 days, most minutes first. */
  byTag: { tag: string; minutes: number }[];
  totals: { today: number; week: number; month: number; allTime: number };
  /** Share of started sessions that were finished, 0–1 (null with no sessions). */
  completionRate: number | null;
}

/** Focus totals for the charts. Only finished sessions count as focus time. */
export function focusStats(sessions: SessionLike[], today: LocalDate, weekCount = 12): FocusStats {
  const thisWeek = weekStart(today);
  const first = addDays(thisWeek, -7 * (weekCount - 1));
  const weeks = Array.from({ length: weekCount }, (_, i) => ({ start: addDays(first, i * 7), minutes: 0, sessions: 0 }));
  const tags = new Map<string, number>();
  const totals = { today: 0, week: 0, month: 0, allTime: 0 };
  let done = 0;

  for (const s of sessions) {
    if (s.status !== 'done') continue;
    done++;
    const age = daysBetween(s.date, today);
    totals.allTime += s.minutes;
    if (age === 0) totals.today += s.minutes;
    if (daysBetween(thisWeek, s.date) >= 0 && age >= 0) totals.week += s.minutes;
    if (age >= 0 && age < 30) {
      totals.month += s.minutes;
      tags.set(s.tag, (tags.get(s.tag) ?? 0) + s.minutes);
    }
    const w = Math.floor(daysBetween(first, s.date) / 7);
    if (w >= 0 && w < weekCount) {
      weeks[w].minutes += s.minutes;
      weeks[w].sessions++;
    }
  }

  return {
    weeks,
    byTag: [...tags].map(([tag, minutes]) => ({ tag, minutes })).sort((a, b) => b.minutes - a.minutes),
    totals,
    completionRate: sessions.length ? done / sessions.length : null,
  };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

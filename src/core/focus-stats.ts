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

/** Minutes of finished focus that fill a focus-heatmap square completely (2 hours). */
export const FOCUS_HEAT_FULL_MIN = 120;

export interface FocusDay {
  date: LocalDate;
  /** 0–100: share of FOCUS_HEAT_FULL_MIN focused that day. */
  score: number;
  minutes: number;
  sessions: number;
}

/** The last `days` days of finished focus, for the focus heatmap (oldest first). */
export function focusHeatDays(sessions: SessionLike[], today: LocalDate, days = 365): FocusDay[] {
  const byDay = new Map<LocalDate, { minutes: number; sessions: number }>();
  for (const s of sessions) {
    if (s.status !== 'done') continue;
    const d = byDay.get(s.date) ?? { minutes: 0, sessions: 0 };
    byDay.set(s.date, { minutes: d.minutes + s.minutes, sessions: d.sessions + 1 });
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    const d = byDay.get(date) ?? { minutes: 0, sessions: 0 };
    const score = d.minutes > 0 ? Math.max(1, Math.round((Math.min(d.minutes, FOCUS_HEAT_FULL_MIN) / FOCUS_HEAT_FULL_MIN) * 100)) : 0;
    return { date, score, ...d };
  });
}

export interface FocusHeatSummary {
  /** Days with any finished focus in the window. */
  daysFocused: number;
  /** Consecutive days with focus, ending today (or yesterday, if today has none yet). */
  currentStreak: number;
  longestStreak: number;
  best: { date: LocalDate; minutes: number } | null;
}

export function focusHeatSummary(days: FocusDay[]): FocusHeatSummary {
  let longest = 0;
  let run = 0;
  let best: FocusHeatSummary['best'] = null;
  for (const d of days) {
    run = d.minutes > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (d.minutes > 0 && (!best || d.minutes > best.minutes)) best = { date: d.date, minutes: d.minutes };
  }
  // Today without focus yet doesn't break the streak.
  let current = 0;
  const last = days.length - 1;
  for (let i = days[last]?.minutes > 0 ? last : last - 1; i >= 0 && days[i].minutes > 0; i--) current++;
  return { daysFocused: days.filter((d) => d.minutes > 0).length, currentStreak: current, longestStreak: longest, best };
}

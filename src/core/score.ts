/** Minimum focus session length (minutes) that counts as a qualifying action on its own. */
export const QUALIFYING_FOCUS_MIN = 25;
const FOCUS_CAP_MIN = 120;

export interface DayActivity {
  habitsScheduled: number;
  habitsCompleted: number;
  focusMinutes: number;
  /** Longest single completed focus session that day, in minutes. */
  longestSessionMinutes: number;
}

/** 0–100: up to 60 points from habits and up to 40 from focus time (capped at 2 hours). */
export function dailyScore(a: DayActivity): number {
  const habitPart = a.habitsScheduled > 0 ? (Math.min(a.habitsCompleted, a.habitsScheduled) / a.habitsScheduled) * 60 : 0;
  const focusPart = (Math.min(a.focusMinutes, FOCUS_CAP_MIN) / FOCUS_CAP_MIN) * 40;
  return Math.round(habitPart + focusPart);
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function heatLevel(score: number): HeatLevel {
  if (score <= 0) return 0;
  if (score < 25) return 1;
  if (score < 50) return 2;
  if (score < 75) return 3;
  return 4;
}

export function isQualifyingDay(a: DayActivity): boolean {
  return a.habitsCompleted > 0 || a.longestSessionMinutes >= QUALIFYING_FOCUS_MIN;
}

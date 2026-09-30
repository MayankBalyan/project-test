import { addDays, daysBetween, LocalDate } from './dates';

/** Rain Days (streak freezes): one earned per 7-day streak, at most this many held. */
export const MAX_RAIN_DAYS = 3;
export const RAIN_DAY_EVERY = 7;

export interface GlobalStreak {
  current: number;
  longest: number;
  rainDaysLeft: number;
  /** Missed days that were covered by a Rain Day. */
  rainDaysUsedOn: LocalDate[];
}

/**
 * Global streak over days with at least one qualifying action. Missed days use a Rain Day
 * automatically when one is available; covered days keep the streak alive but do not add to it.
 * `today` never breaks the streak because the day is still in progress.
 */
export function globalStreak(
  activeDates: Iterable<LocalDate>,
  today: LocalDate,
  { rainDays = true }: { rainDays?: boolean } = {},
): GlobalStreak {
  const active = new Set(activeDates);
  const result: GlobalStreak = { current: 0, longest: 0, rainDaysLeft: 0, rainDaysUsedOn: [] };
  const first = [...active].sort()[0];
  if (!first) return result;

  let run = 0;
  let bank = 0;
  for (let d = first; daysBetween(d, today) >= 0; d = addDays(d, 1)) {
    if (active.has(d)) {
      run++;
      if (rainDays && run % RAIN_DAY_EVERY === 0) bank = Math.min(MAX_RAIN_DAYS, bank + 1);
    } else if (d === today) {
      // Still in progress.
    } else if (run > 0 && bank > 0) {
      bank--;
      result.rainDaysUsedOn.push(d);
    } else {
      run = 0;
    }
    result.longest = Math.max(result.longest, run);
  }
  result.current = run;
  result.rainDaysLeft = bank;
  return result;
}

export const STREAK_MILESTONES = [7, 30, 100, 365];

export interface StreakStatus {
  /** The most recent missed day a Rain Day covered, if it was in the last 3 days. */
  rescuedOn: LocalDate | null;
  /** The next milestone above the current streak (grows by a year past 365). */
  nextMilestone: number;
  daysToNext: number;
  /** The streak was broken: nothing now, but there was a streak before. */
  restarting: boolean;
}

export function streakStatus(streak: GlobalStreak, today: LocalDate): StreakStatus {
  const last = streak.rainDaysUsedOn[streak.rainDaysUsedOn.length - 1];
  const rescuedOn = last && daysBetween(last, today) <= 3 ? last : null;
  const nextMilestone =
    STREAK_MILESTONES.find((m) => m > streak.current) ?? (Math.floor(streak.current / 365) + 1) * 365;
  return {
    rescuedOn,
    nextMilestone,
    daysToNext: nextMilestone - streak.current,
    restarting: streak.current === 0 && streak.longest > 0,
  };
}

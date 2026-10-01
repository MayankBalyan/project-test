import { daysBetween, LocalDate } from './dates';

export type Species = 'flower' | 'shrub' | 'sapling' | 'pine' | 'oak';
export type PlantStage = 'seed' | 'sprout' | 'young' | 'mature' | 'wilted';

export interface FocusSessionRecord {
  id: string;
  date: LocalDate;
  /** Minutes actually focused. */
  minutes: number;
  status: 'done' | 'given_up';
  createdAt: number;
}

export interface Plant {
  id: string;
  /** The focus session that planted it (a long session plants several). */
  sessionId: string;
  species: Species;
  stage: PlantStage;
  plantedOn: LocalDate;
  /** Habit days on or after planting, capped at WATERINGS_TO_MATURE. */
  waterings: number;
}

/** Focus length limits for the timer dial, in minutes. */
export const FOCUS_MIN_MINUTES = 10;
export const FOCUS_MAX_MINUTES = 180;
export const FOCUS_STEP_MINUTES = 5;

/** Snaps any length to the dial: 10–180 minutes in 5-minute steps. */
export function clampFocusMinutes(minutes: number): number {
  const snapped = Math.round(minutes / FOCUS_STEP_MINUTES) * FOCUS_STEP_MINUTES;
  return Math.min(FOCUS_MAX_MINUTES, Math.max(FOCUS_MIN_MINUTES, snapped));
}

/** Every full half hour of a finished session plants one tree: 3 hours plants 6. Always at least one. */
export const MINUTES_PER_TREE = 30;

export function treesFor(minutes: number): number {
  return Math.max(1, Math.floor(minutes / MINUTES_PER_TREE));
}

/** Days a plant must be watered (days with at least one habit done) to reach maturity. */
export const WATERINGS_TO_MATURE = 3;

export function speciesFor(minutes: number): Species {
  if (minutes >= 90) return 'oak';
  if (minutes >= 50) return 'pine';
  if (minutes >= 40) return 'sapling';
  if (minutes >= 25) return 'shrub';
  return 'flower';
}

const STAGES: PlantStage[] = ['seed', 'sprout', 'young', 'mature'];

/**
 * The island is derived from history, never stored, so it cannot drift out of sync between devices.
 * A finished session plants one tree per half hour (see `treesFor`). Habit days on or after the planting
 * day water them. A given-up session leaves one wilted sprout until a later session is completed.
 */
export function growPlants(sessions: FocusSessionRecord[], wateredDays: Iterable<LocalDate>): Plant[] {
  const watered = [...new Set(wateredDays)];
  const ordered = [...sessions].sort((a, b) => a.createdAt - b.createdAt);
  return ordered.flatMap((s, i): Plant[] => {
    const species = speciesFor(s.minutes);
    if (s.status === 'given_up') {
      const revived = ordered.slice(i + 1).some((later) => later.status === 'done');
      return [{ id: s.id, sessionId: s.id, species, plantedOn: s.date, stage: revived ? 'sprout' : 'wilted', waterings: 0 }];
    }
    const waterings = Math.min(watered.filter((d) => daysBetween(s.date, d) >= 0).length, WATERINGS_TO_MATURE);
    return Array.from({ length: treesFor(s.minutes) }, (_, k) => ({
      id: k === 0 ? s.id : `${s.id}#${k}`,
      sessionId: s.id,
      species,
      plantedOn: s.date,
      stage: STAGES[waterings],
      waterings,
    }));
  });
}

export const STREAK_UNLOCKS = [
  { days: 7, key: 'stream', label: 'A stream' },
  { days: 30, key: 'creatures', label: 'Birds & butterflies' },
  { days: 100, key: 'waterfall', label: 'A waterfall' },
  { days: 365, key: 'seasons', label: 'Seasons & night sky' },
] as const;

export type UnlockKey = (typeof STREAK_UNLOCKS)[number]['key'];

export function unlocksFor(longestStreak: number): UnlockKey[] {
  return STREAK_UNLOCKS.filter((u) => longestStreak >= u.days).map((u) => u.key);
}

export function nextUnlock(longestStreak: number) {
  return STREAK_UNLOCKS.find((u) => longestStreak < u.days) ?? null;
}

/** Island size tier (0–5) from lifetime focus hours: 10, 50, 100, 250, 500. */
export function islandTier(focusMinutes: number): number {
  const hours = focusMinutes / 60;
  return [10, 50, 100, 250, 500].filter((h) => hours >= h).length;
}

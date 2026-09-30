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
  species: Species;
  stage: PlantStage;
  plantedOn: LocalDate;
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
 * Each focus session plants one plant. Habit days on or after the planting day water it.
 * A given-up session leaves a wilted sprout until a later session is completed.
 */
export function growPlants(sessions: FocusSessionRecord[], wateredDays: Iterable<LocalDate>): Plant[] {
  const watered = [...new Set(wateredDays)];
  const ordered = [...sessions].sort((a, b) => a.createdAt - b.createdAt);
  return ordered.map((s, i) => {
    const species = speciesFor(s.minutes);
    if (s.status === 'given_up') {
      const revived = ordered.slice(i + 1).some((later) => later.status === 'done');
      return { id: s.id, species, plantedOn: s.date, stage: revived ? 'sprout' : 'wilted' };
    }
    const waterings = watered.filter((d) => daysBetween(s.date, d) >= 0).length;
    const stage = STAGES[Math.min(waterings, WATERINGS_TO_MATURE)];
    return { id: s.id, species, plantedOn: s.date, stage };
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

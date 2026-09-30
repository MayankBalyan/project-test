import { HabitInput } from './habit-input';

/** Habit ideas offered on first launch. Kept small so people start with habits they can keep. */
export const STARTER_HABITS: { id: string; note: string; input: HabitInput }[] = [
  {
    id: 'read',
    note: 'Every day',
    input: { name: 'Read 20 pages', kind: 'check', target: 1, schedule: { type: 'daily' } },
  },
  {
    id: 'water',
    note: '8 glasses a day',
    input: { name: 'Drink water', kind: 'count', target: 8, schedule: { type: 'daily' } },
  },
  {
    id: 'meditate',
    note: 'Every day',
    input: { name: 'Meditate', kind: 'check', target: 1, schedule: { type: 'daily' } },
  },
  {
    id: 'exercise',
    note: '3× a week',
    input: { name: 'Exercise', kind: 'check', target: 1, schedule: { type: 'timesPerWeek', times: 3 } },
  },
  {
    id: 'journal',
    note: 'Every evening',
    input: { name: 'Journal', kind: 'check', target: 1, schedule: { type: 'daily' } },
  },
  {
    id: 'walk',
    note: 'Mon–Fri',
    input: { name: 'Go for a walk', kind: 'check', target: 1, schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] } },
  },
];

export const MAX_STARTER_PICKS = 3;
export const ISLAND_NAME_MAX = 24;

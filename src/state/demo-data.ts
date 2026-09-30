import { addDays, LocalDate } from '@/core/dates';
import { HabitEvent, isScheduledOn } from '@/core/habits';
import { FocusSessionRecord } from '@/core/world';

import type { NamedHabit, TaggedSession } from './store';

/**
 * Sample history so the design can be seen with real-looking data before persistence and onboarding exist.
 * Remove once habits are created through onboarding.
 */
export function demoData(today: LocalDate): {
  habits: NamedHabit[];
  events: HabitEvent[];
  sessions: TaggedSession[];
} {
  const createdOn = addDays(today, -200);
  const habits: NamedHabit[] = [
    { id: 'read', name: 'Read 20 pages', kind: 'check', target: 1, schedule: { type: 'daily' }, createdOn },
    { id: 'water', name: 'Drink water', kind: 'count', target: 8, schedule: { type: 'daily' }, createdOn },
    {
      id: 'meditate',
      name: 'Meditate',
      kind: 'check',
      target: 1,
      schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] },
      createdOn,
    },
    { id: 'gym', name: 'Gym', kind: 'check', target: 1, schedule: { type: 'timesPerWeek', times: 3 }, createdOn },
  ];

  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const events: HabitEvent[] = [];
  const sessions: TaggedSession[] = [];
  const tags = ['Study', 'Work', 'Reading'];
  for (let back = 200; back >= 1; back--) {
    const date = addDays(today, -back);
    const recent = back <= 23;
    const dayEnergy = recent ? 0.9 : rand() * 1.1;
    for (const h of habits) {
      const scheduled = h.schedule.type === 'timesPerWeek' ? rand() < 0.5 : isScheduledOn(h.schedule, date);
      if (!scheduled || (!recent && rand() > dayEnergy)) continue;
      events.push({
        id: `${h.id}-${date}`,
        habitId: h.id,
        date,
        type: 'complete',
        value: h.target,
        createdAt: Date.parse(`${date}T09:00:00Z`),
      });
    }
    const count = Math.floor(rand() * 3 * dayEnergy + (recent ? 1 : 0));
    for (let i = 0; i < count; i++) {
      const minutes = [25, 25, 50, 90][Math.floor(rand() * 4)];
      const session: FocusSessionRecord & { tag: string } = {
        id: `s-${date}-${i}`,
        date,
        minutes,
        status: rand() < 0.08 ? 'given_up' : 'done',
        createdAt: Date.parse(`${date}T1${i}:00:00Z`),
        tag: tags[Math.floor(rand() * tags.length)],
      };
      sessions.push(session);
    }
  }
  return { habits, events, sessions };
}

import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, toLocalDate, weekday } from '../dates';
import { dailyValues, Habit, HabitEvent, habitStreak, isDoneOn } from '../habits';
import { dailyScore, heatLevel, isQualifyingDay } from '../score';
import { globalStreak, streakStatus } from '../streaks';
import { growPlants, islandTier, nextUnlock, unlocksFor } from '../world';
import { focusStats, formatMinutes } from '../focus-stats';
import {
  addToOutbox,
  applyPulled,
  clearSent,
  EMPTY_OUTBOX,
  eventToRow,
  fullOutbox,
  habitToRow,
  nextCursor,
  rowToEvent,
  rowToHabit,
  rowToSession,
  sessionToRow,
} from '../sync';
import { endsAt, formatRemaining, leftTooLong, pause, plannedEndAt, remainingMs, resume, startTimer } from '../timer';
import { isCompleteOtp, isValidEmail, normalizeEmail, normalizeOtp, parseAuthRedirect } from '../auth-input';
import { formatTime, normalizeHabit, validateHabit } from '../habit-input';
import { planNotifications } from '../notify-plan';
import { STARTER_HABITS } from '../starters';
import { toCsvExport, toJsonExport } from '../export';

const done = (habitId: string, date: string, value = 1, id = `${habitId}-${date}`): HabitEvent => ({
  id,
  habitId,
  date,
  type: 'complete',
  value,
  createdAt: Date.parse(date),
});

describe('dates', () => {
  it('counts activity before the day-start hour toward the previous day', () => {
    const cfg = { timeZone: 'Asia/Kolkata', dayStartHour: 4 };
    // 02:30 IST on Oct 1 = Sep 30 21:00 UTC
    expect(toLocalDate(new Date('2026-09-30T21:00:00Z'), cfg)).toBe('2026-09-30');
    // 04:30 IST on Oct 1
    expect(toLocalDate(new Date('2026-09-30T23:00:00Z'), cfg)).toBe('2026-10-01');
  });

  it('does date arithmetic across months', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(daysBetween('2026-09-25', '2026-10-02')).toBe(7);
    expect(weekday('2026-09-30')).toBe(3); // Wednesday
  });
});

describe('habit streaks', () => {
  const daily: Habit = { id: 'h', kind: 'check', target: 1, schedule: { type: 'daily' }, createdOn: '2026-09-20' };

  it('counts consecutive days and does not break on an unfinished today', () => {
    const events = ['2026-09-27', '2026-09-28', '2026-09-29'].map((d) => done('h', d));
    expect(habitStreak(daily, events, '2026-09-30')).toEqual({ current: 3, longest: 3 });
  });

  it('breaks on a missed past day', () => {
    const events = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-25'].map((d) => done('h', d));
    expect(habitStreak(daily, events, '2026-09-26')).toEqual({ current: 1, longest: 3 });
  });

  it('ignores unscheduled days', () => {
    const mwf: Habit = { ...daily, schedule: { type: 'weekdays', days: [1, 3, 5] } };
    // Mon 21, Wed 23, Fri 25, Mon 28
    const events = ['2026-09-21', '2026-09-23', '2026-09-25', '2026-09-28'].map((d) => done('h', d));
    expect(habitStreak(mwf, events, '2026-09-29').current).toBe(4);
  });

  it('requires reaching the target for count habits', () => {
    const water: Habit = { ...daily, kind: 'count', target: 8 };
    const events = [done('h', '2026-09-28', 8), done('h', '2026-09-29', 5)];
    expect(habitStreak(water, events, '2026-09-30').current).toBe(0);
  });

  it('counts weeks for times-per-week habits', () => {
    const gym: Habit = { ...daily, createdOn: '2026-09-14', schedule: { type: 'timesPerWeek', times: 2 } };
    const events = ['2026-09-15', '2026-09-17', '2026-09-22', '2026-09-24', '2026-09-29'].map((d) => done('h', d));
    // Two full weeks done; current week in progress with 1 of 2.
    expect(habitStreak(gym, events, '2026-09-30')).toEqual({ current: 2, longest: 2 });
  });

  it('de-duplicates events synced from multiple devices and applies undo', () => {
    const e = done('h', '2026-09-29');
    const undo: HabitEvent = { ...e, id: 'u1', type: 'undo', createdAt: e.createdAt + 1 };
    expect(dailyValues([e, e]).get('2026-09-29')).toBe(1);
    expect(dailyValues([e, undo]).get('2026-09-29')).toBe(0);
  });
});

describe('global streak', () => {
  const range = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));

  it('uses a Rain Day after a 7-day streak', () => {
    const active = [...range('2026-09-01', 7), ...range('2026-09-09', 3)];
    const s = globalStreak(active, '2026-09-11');
    expect(s.current).toBe(10);
    expect(s.rainDaysUsedOn).toEqual(['2026-09-08']);
    expect(s.rainDaysLeft).toBe(0);
  });

  it('breaks without Rain Days', () => {
    const active = [...range('2026-09-01', 7), ...range('2026-09-09', 3)];
    expect(globalStreak(active, '2026-09-11', { rainDays: false })).toMatchObject({ current: 3, longest: 7 });
  });
});

describe('score', () => {
  it('weights habits 60 and focus 40', () => {
    const a = { habitsScheduled: 4, habitsCompleted: 2, focusMinutes: 60, longestSessionMinutes: 25 };
    expect(dailyScore(a)).toBe(50);
    expect(heatLevel(dailyScore(a))).toBe(3);
    expect(isQualifyingDay({ ...a, habitsCompleted: 0 })).toBe(true);
    expect(isQualifyingDay({ ...a, habitsCompleted: 0, longestSessionMinutes: 20 })).toBe(false);
  });
});

describe('timer', () => {
  it('derives the same countdown from timestamps, including pauses', () => {
    let t = startTimer(0, 25);
    t = pause(t, 5 * 60_000);
    expect(endsAt(t, 6 * 60_000)).toBeNull();
    t = resume(t, 8 * 60_000);
    expect(remainingMs(t, 10 * 60_000)).toBe(18 * 60_000);
    expect(formatRemaining(remainingMs(t, 10 * 60_000))).toBe('18:00');
    expect(remainingMs(t, 60 * 60_000)).toBe(0);
  });

  it('limits pauses to two', () => {
    let t = startTimer(0, 25);
    for (let i = 0; i < 3; i++) t = resume(pause(t, i * 1000), i * 1000 + 500);
    expect(t.pauses).toHaveLength(2);
  });
});

describe('world', () => {
  const session = (id: string, date: string, minutes: number, status: 'done' | 'given_up' = 'done') => ({
    id,
    date,
    minutes,
    status,
    createdAt: Date.parse(date) + Number(id.slice(1)),
  });

  it('grows plants with watering days and picks species by session length', () => {
    const plants = growPlants([session('s1', '2026-09-27', 25), session('s2', '2026-09-29', 90)], [
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
    ]);
    expect(plants.map((p) => [p.species, p.stage])).toEqual([
      ['shrub', 'mature'],
      ['oak', 'sprout'],
    ]);
  });

  it('wilts a given-up session until a later session is completed', () => {
    const wilted = growPlants([session('s1', '2026-09-29', 10, 'given_up')], []);
    expect(wilted[0].stage).toBe('wilted');
    const revived = growPlants([session('s1', '2026-09-29', 10, 'given_up'), session('s2', '2026-09-30', 25)], []);
    expect(revived[0].stage).toBe('sprout');
  });

  it('unlocks world features by longest streak and grows the island by hours', () => {
    expect(unlocksFor(31)).toEqual(['stream', 'creatures']);
    expect(nextUnlock(31)?.days).toBe(100);
    expect(islandTier(60 * 60)).toBe(2);
  });
});

describe('habit input', () => {
  const base = { name: '  Read  ', kind: 'check' as const, target: 1, schedule: { type: 'daily' as const } };

  it('accepts a valid habit and normalizes it', () => {
    expect(validateHabit(base)).toBeNull();
    expect(normalizeHabit({ ...base, target: 5 })).toMatchObject({ name: 'Read', target: 1 });
    expect(normalizeHabit({ ...base, schedule: { type: 'weekdays', days: [5, 1, 1] } }).schedule).toEqual({
      type: 'weekdays',
      days: [1, 5],
    });
  });

  it('rejects empty names, bad goals and empty schedules', () => {
    expect(validateHabit({ ...base, name: '   ' })).toMatch(/name/);
    expect(validateHabit({ ...base, name: 'x'.repeat(41) })).toMatch(/40/);
    expect(validateHabit({ ...base, kind: 'count', target: 1 })).toMatch(/goal/);
    expect(validateHabit({ ...base, schedule: { type: 'weekdays', days: [] } })).toMatch(/day/);
    expect(validateHabit({ ...base, schedule: { type: 'timesPerWeek', times: 7 } })).toMatch(/week/);
    expect(validateHabit({ ...base, schedule: { type: 'everyNDays', n: 1, anchor: '2026-09-30' } })).toMatch(/every/i);
  });
});

describe('timer end', () => {
  it('knows when a session ended even if the app was closed', () => {
    let t = startTimer(0, 25);
    t = resume(pause(t, 60_000), 120_000);
    expect(plannedEndAt(t)).toBe(26 * 60_000);
    expect(plannedEndAt(pause(t, 180_000))).toBeNull();
  });
});

describe('auth input', () => {
  it('validates and normalizes emails', () => {
    expect(isValidEmail('  Mayank@Example.com ')).toBe(true);
    expect(normalizeEmail('  Mayank@Example.com ')).toBe('mayank@example.com');
    expect(isValidEmail('mayank@example')).toBe(false);
    expect(isValidEmail('not an email')).toBe(false);
  });

  it('accepts pasted codes with spaces', () => {
    expect(normalizeOtp('123 456')).toBe('123456');
    expect(isCompleteOtp('12-34-5')).toBe(false);
    expect(normalizeOtp('1234567')).toBe('123456');
  });

  it('reads codes and errors from OAuth redirects', () => {
    expect(parseAuthRedirect('rootline://auth/callback?code=abc123')).toEqual({ code: 'abc123' });
    expect(parseAuthRedirect('http://localhost:8081/auth/callback?code=x#')).toEqual({ code: 'x' });
    expect(parseAuthRedirect('rootline://auth/callback#error=access_denied&error_description=User+cancelled')).toEqual({
      error: 'User cancelled',
    });
    expect(parseAuthRedirect('rootline://auth/callback')).toEqual({});
  });
});

describe('starter habits', () => {
  it('are all valid habits with unique ids', () => {
    for (const s of STARTER_HABITS) expect(validateHabit(s.input)).toBeNull();
    expect(new Set(STARTER_HABITS.map((s) => s.id)).size).toBe(STARTER_HABITS.length);
  });
});

describe('export', () => {
  const data = {
    exportedAt: '2026-09-30T10:00:00Z',
    settings: { islandName: 'Kepler' },
    habits: [{ id: 'h', name: 'Read, then "journal"' }],
    events: [done('h', '2026-09-29'), done('h', '2026-09-28')],
    sessions: [{ date: '2026-09-29', minutes: 25, status: 'done', tag: '=SUM(A1)' }],
  };

  it('writes CSV sorted by date with quoting and formula protection', () => {
    expect(toCsvExport(data).split('\n')).toEqual([
      'date,type,name,value,status',
      '2026-09-28,habit,"Read, then ""journal""",1,done',
      '2026-09-29,habit,"Read, then ""journal""",1,done',
      "2026-09-29,focus,'=SUM(A1),25,done",
      '',
    ]);
  });

  it('writes JSON with a version', () => {
    expect(JSON.parse(toJsonExport(data))).toMatchObject({ app: 'rootline', version: 1, habits: data.habits });
  });
});

describe('notification plan', () => {
  // Treat dates as UTC so the test does not depend on the machine's time zone.
  const toInstant = (date: string, h: number, m: number) => Date.parse(`${date}T${formatTime(h, m)}:00Z`);
  const base = {
    now: Date.parse('2026-09-30T10:00:00Z'),
    today: '2026-09-30',
    dayConfig: { timeZone: 'UTC', dayStartHour: 4 },
    habits: [
      { id: 'read', name: 'Read', schedule: { type: 'daily' as const }, createdOn: '2026-09-01', reminders: ['08:00', '21:00'] },
      { id: 'gym', name: 'Gym', schedule: { type: 'weekdays' as const, days: [4] }, createdOn: '2026-09-01', reminders: ['18:00'] },
    ],
    doneToday: new Set<string>(),
    qualifiedToday: false,
    currentStreak: 12,
    streakAtRisk: { enabled: true, hour: 20 },
    focusEnd: { enabled: true, at: Date.parse('2026-09-30T10:25:00Z') },
    toInstant,
    days: 2,
  };

  it('plans reminders, the streak nudge and the focus end in time order, skipping the past', () => {
    expect(planNotifications(base).map((n) => n.id)).toEqual([
      'focus:end',
      'streak:2026-09-30',
      'habit:read:2026-09-30:21:00',
      'habit:read:2026-10-01:08:00',
      'habit:gym:2026-10-01:18:00', // Thursday only
      'streak:2026-10-01',
      'habit:read:2026-10-01:21:00',
    ]);
    expect(planNotifications(base)[1].title).toBe('Your 12-day streak is at risk');
  });

  it('skips today for done habits and the nudge once today counts', () => {
    const ids = planNotifications({ ...base, doneToday: new Set(['read']), qualifiedToday: true }).map((n) => n.id);
    expect(ids).not.toContain('habit:read:2026-09-30:21:00');
    expect(ids).not.toContain('streak:2026-09-30');
    expect(ids).toContain('habit:read:2026-10-01:08:00');
  });

  it('respects switches, archived habits and the cap', () => {
    const off = planNotifications({
      ...base,
      streakAtRisk: { enabled: false, hour: 20 },
      focusEnd: { enabled: false, at: null },
      habits: base.habits.map((h) => ({ ...h, archivedAt: 1 })),
    });
    expect(off).toEqual([]);
    expect(planNotifications({ ...base, days: 30, max: 5 })).toHaveLength(5);
  });

  it('validates reminder times', () => {
    const habit = { name: 'Read', kind: 'check' as const, target: 1, schedule: { type: 'daily' as const } };
    expect(validateHabit({ ...habit, reminders: ['8:00'] })).toMatch(/08:30/);
    expect(validateHabit({ ...habit, reminders: ['07:00', '08:00', '09:00', '10:00'] })).toMatch(/3/);
    expect(normalizeHabit({ ...habit, reminders: ['21:00', '07:30', '21:00'] }).reminders).toEqual(['07:30', '21:00']);
  });
});

describe('streak status', () => {
  const s = { current: 10, longest: 12, rainDaysLeft: 0, rainDaysUsedOn: ['2026-09-28'] };

  it('reports a recent rescue and the next milestone', () => {
    expect(streakStatus(s, '2026-09-30')).toEqual({
      rescuedOn: '2026-09-28',
      nextMilestone: 30,
      daysToNext: 20,
      restarting: false,
    });
    expect(streakStatus(s, '2026-10-05').rescuedOn).toBeNull();
  });

  it('knows when a streak restarts and handles streaks past a year', () => {
    expect(streakStatus({ ...s, current: 0, rainDaysUsedOn: [] }, '2026-09-30')).toMatchObject({
      restarting: true,
      nextMilestone: 7,
    });
    expect(streakStatus({ ...s, current: 400 }, '2026-09-30').nextMilestone).toBe(730);
  });
});

describe('duration habits', () => {
  const habit = { name: 'Read', kind: 'duration' as const, target: 30, schedule: { type: 'daily' as const } };

  it('validates minutes and keeps the target', () => {
    expect(validateHabit(habit)).toBeNull();
    expect(validateHabit({ ...habit, target: 3 })).toMatch(/minutes/);
    expect(validateHabit({ ...habit, target: 300 })).toMatch(/minutes/);
    expect(normalizeHabit(habit).target).toBe(30);
  });

  it('is done once logged minutes reach the target', () => {
    const h: Habit = { id: 'h', kind: 'duration', target: 30, schedule: { type: 'daily' }, createdOn: '2026-09-01' };
    const events = [done('h', '2026-09-29', 20, 'a'), done('h', '2026-09-29', 15, 'b'), done('h', '2026-09-30', 25, 'c')];
    const values = dailyValues(events);
    expect(isDoneOn(h, values, '2026-09-29')).toBe(true);
    expect(isDoneOn(h, values, '2026-09-30')).toBe(false);
  });
});

describe('stay focused', () => {
  const t = startTimer(0, 25);
  it('wilts only when away longer than the grace period during a running session', () => {
    expect(leftTooLong(t, 60_000, 65_000)).toBe(false);
    expect(leftTooLong(t, 60_000, 90_000)).toBe(true);
    expect(leftTooLong(pause(t, 50_000), 60_000, 600_000)).toBe(false);
  });

  it('does not wilt a session that finished while away', () => {
    // Left 5 s before the end, came back much later: only 5 s of the session were missed.
    expect(leftTooLong(t, 25 * 60_000 - 5_000, 40 * 60_000)).toBe(false);
  });
});

describe('focus stats', () => {
  const s = (date: string, minutes: number, tag = 'Study', status: 'done' | 'given_up' = 'done') => ({ date, minutes, tag, status });
  const sessions = [
    s('2026-09-30', 25), // Wed, this week
    s('2026-09-28', 50, 'Work'), // Mon, this week
    s('2026-09-27', 25), // Sun, last week
    s('2026-09-29', 10, 'Work', 'given_up'),
    s('2026-07-01', 90), // outside 12 weeks and 30 days
  ];

  it('totals finished focus by day, week, month and all time', () => {
    const st = focusStats(sessions, '2026-09-30');
    expect(st.totals).toEqual({ today: 25, week: 75, month: 100, allTime: 190 });
    expect(st.completionRate).toBe(0.8);
  });

  it('buckets weeks from Monday and ranks tags', () => {
    const st = focusStats(sessions, '2026-09-30');
    expect(st.weeks).toHaveLength(12);
    expect(st.weeks[11]).toEqual({ start: '2026-09-28', minutes: 75, sessions: 2 });
    expect(st.weeks[10]).toEqual({ start: '2026-09-21', minutes: 25, sessions: 1 });
    expect(st.byTag).toEqual([
      { tag: 'Study', minutes: 50 },
      { tag: 'Work', minutes: 50 },
    ]);
  });

  it('formats minutes', () => {
    expect([formatMinutes(45), formatMinutes(60), formatMinutes(135)]).toEqual(['45m', '1h', '2h 15m']);
  });
});

describe('sync merge', () => {
  const habit = (id: string, name: string, updatedAt: number, extra = {}) => ({
    id,
    name,
    kind: 'check' as const,
    target: 1,
    schedule: { type: 'daily' as const },
    createdOn: '2026-09-01',
    updatedAt,
    ...extra,
  });
  const session = (id: string) => ({ id, date: '2026-09-30', minutes: 25, status: 'done' as const, tag: 'Study', createdAt: 1 });
  const base = {
    habits: [habit('a', 'Read', 100), habit('b', 'Walk', 100)],
    events: [done('a', '2026-09-29', 1, 'e1'), done('b', '2026-09-29', 1, 'e2')],
    sessions: [session('s1')],
    settings: { value: { islandName: 'Local' }, updatedAt: 50 },
    focus: { value: null, updatedAt: 10 },
  };

  it('keeps the newest version of each habit and adds new ones', () => {
    const merged = applyPulled(base, {
      habits: [habit('a', 'Read more', 200), habit('b', 'Old walk', 90), habit('c', 'Journal', 150)],
      events: [],
      sessions: [],
      settings: null,
      focus: null,
    });
    expect(merged.habits.map((h) => h.name)).toEqual(['Read more', 'Walk', 'Journal']);
  });

  it('unions check-ins and sessions by id and drops check-ins of deleted habits', () => {
    const merged = applyPulled(base, {
      habits: [habit('b', 'Walk', 300, { deletedAt: 300 })],
      events: [done('a', '2026-09-30', 1, 'e3'), done('a', '2026-09-29', 1, 'e1')],
      sessions: [session('s1'), session('s2')],
      settings: { value: { islandName: 'Remote' }, updatedAt: 60 },
      focus: { value: null, updatedAt: 5 },
    });
    expect(merged.events.map((e) => e.id)).toEqual(['e1', 'e3']);
    expect(merged.sessions.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(merged.settings.value).toEqual({ islandName: 'Remote' });
    expect(merged.focus.updatedAt).toBe(10);
    // Applying the same pull again changes nothing.
    expect(applyPulled(merged, { habits: [], events: [done('a', '2026-09-30', 1, 'e3')], sessions: [], settings: null, focus: null })).toEqual(merged);
  });

  it('tracks what still needs sending', () => {
    let o = addToOutbox(EMPTY_OUTBOX, 'events', ['e1', 'e2']);
    o = addToOutbox({ ...o, settings: true }, 'events', ['e2', 'e3']);
    expect(o.events).toEqual(['e1', 'e2', 'e3']);
    expect(clearSent(o, { ...EMPTY_OUTBOX, events: ['e1', 'e3'], settings: true })).toEqual({ ...EMPTY_OUTBOX, events: ['e2'] });
    expect(fullOutbox(base)).toMatchObject({ habits: ['a', 'b'], events: ['e1', 'e2'], sessions: ['s1'], settings: true });
  });

  it('maps rows both ways', () => {
    const h = habit('a', 'Read', 100, { reminders: ['08:00'], archivedAt: 5 });
    expect(rowToHabit(habitToRow(h))).toEqual({ ...h, deletedAt: undefined });
    const e = done('a', '2026-09-29', 3, 'e1');
    expect(rowToEvent(eventToRow(e))).toEqual(e);
    const s = { ...session('s1'), habitId: 'a' };
    expect(rowToSession(sessionToRow(s))).toEqual(s);
  });

  it('moves the pull cursor forward with a small overlap, never backward', () => {
    expect(nextCursor(null, [])).toBeNull();
    const c = nextCursor(null, ['2026-10-01T12:00:10.000Z', '2026-10-01T12:00:20.123456+00:00']);
    expect(c).toBe('2026-10-01T12:00:15.123Z');
    expect(nextCursor(c, [])).toBe(c);
    expect(nextCursor(c, ['2026-10-01T12:00:16.000Z'])).toBe(c);
  });
});

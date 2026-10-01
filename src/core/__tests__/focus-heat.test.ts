import { describe, expect, it } from 'vitest';

import { focusHeatDays, focusHeatSummary } from '../focus-stats';

const s = (date: string, minutes: number, status: 'done' | 'given_up' = 'done') => ({ date, minutes, status, tag: 'Study' });

describe('focus heatmap', () => {
  it('shades each day by finished focus, up to two hours', () => {
    const days = focusHeatDays(
      [s('2026-10-01', 25), s('2026-10-01', 35), s('2026-09-30', 180), s('2026-09-29', 50, 'given_up'), s('2026-09-28', 1)],
      '2026-10-01',
      5,
    );
    expect(days.map((d) => [d.date, d.score, d.minutes, d.sessions])).toEqual([
      ['2026-09-27', 0, 0, 0],
      ['2026-09-28', 1, 1, 1],
      ['2026-09-29', 0, 0, 0],
      ['2026-09-30', 100, 180, 1],
      ['2026-10-01', 50, 60, 2],
    ]);
  });

  it('counts focus days, streaks and the best day', () => {
    const days = focusHeatDays([s('2026-09-25', 30), s('2026-09-26', 30), s('2026-09-27', 30), s('2026-09-29', 90), s('2026-09-30', 20)], '2026-10-01', 10);
    expect(focusHeatSummary(days)).toEqual({
      daysFocused: 5,
      currentStreak: 2, // 29th and 30th; nothing yet today
      longestStreak: 3,
      best: { date: '2026-09-29', minutes: 90 },
    });
    expect(focusHeatSummary(focusHeatDays([], '2026-10-01', 5))).toEqual({ daysFocused: 0, currentStreak: 0, longestStreak: 0, best: null });
  });
});

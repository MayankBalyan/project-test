import { describe, expect, it } from 'vitest';

import { planNotifications } from '../notify-plan';
import {
  describeDay,
  describeDue,
  groupTodos,
  isOverdue,
  monthGrid,
  normalizeTodo,
  quickDueDates,
  todayTodos,
  Todo,
  validateTodo,
} from '../todos';

const TODAY = '2026-10-01'; // a Thursday
const todo = (id: string, extra: Partial<Todo> = {}): Todo => ({
  id,
  title: id,
  createdAt: Number(id.replace(/\D/g, '') || 0),
  updatedAt: 1,
  ...extra,
});

describe('to-dos', () => {
  it('validates and tidies input', () => {
    expect(validateTodo({ title: '  ' })).toBe('Give it a name.');
    expect(validateTodo({ title: 'Pay rent', dueTime: '09:00' })).toBe('Pick a day for the deadline first.');
    expect(validateTodo({ title: 'Pay rent', dueDate: TODAY, dueTime: '25:00' })).toBe('That time doesn’t look right.');
    expect(validateTodo({ title: 'Pay rent', dueDate: TODAY, dueTime: '18:30' })).toBeNull();
    expect(normalizeTodo({ title: '  Pay   rent ', notes: '  ', dueTime: '10:00' })).toEqual({
      title: 'Pay rent',
      notes: undefined,
      dueDate: undefined,
      dueTime: undefined,
    });
  });

  it('knows when a deadline has passed', () => {
    expect(isOverdue(todo('a', { dueDate: '2026-09-30' }), TODAY, 600)).toBe(true);
    expect(isOverdue(todo('a', { dueDate: TODAY }), TODAY, 23 * 60)).toBe(false);
    expect(isOverdue(todo('a', { dueDate: TODAY, dueTime: '18:00' }), TODAY, 17 * 60)).toBe(false);
    expect(isOverdue(todo('a', { dueDate: TODAY, dueTime: '18:00' }), TODAY, 18 * 60)).toBe(true);
    expect(isOverdue(todo('a', { dueDate: '2026-09-30', doneAt: 5 }), TODAY, 600)).toBe(false);
    // 1 AM on the 2nd is still the app's 1st (the day starts at 4 AM); a deadline at 23:00 on the 1st is late.
    expect(isOverdue(todo('a', { dueDate: TODAY, dueTime: '23:00' }), TODAY, 60, '2026-10-02')).toBe(true);
    expect(isOverdue(todo('a', { dueDate: TODAY }), TODAY, 60, '2026-10-02')).toBe(false);
  });

  it('groups into overdue, today, upcoming, someday and done, in order', () => {
    const g = groupTodos(
      [
        todo('t1', { dueDate: '2026-10-05' }),
        todo('t2', { dueDate: TODAY }),
        todo('t3', { dueDate: TODAY, dueTime: '09:00' }),
        todo('t4'),
        todo('t5', { dueDate: '2026-09-28' }),
        todo('t6', { doneAt: 10 }),
        todo('t7', { doneAt: 20 }),
        todo('t8', { deletedAt: 1 }),
        todo('t9', { dueDate: '2026-10-02', dueTime: '08:00' }),
      ],
      TODAY,
      8 * 60,
    );
    const ids = (list: Todo[]) => list.map((t) => t.id);
    expect(ids(g.overdue)).toEqual(['t5']);
    expect(ids(g.today)).toEqual(['t3', 't2']);
    expect(ids(g.upcoming)).toEqual(['t9', 't1']);
    expect(ids(g.someday)).toEqual(['t4']);
    expect(ids(g.done)).toEqual(['t7', 't6']);
  });

  it('describes deadlines in words', () => {
    expect(describeDay(TODAY, TODAY)).toBe('Today');
    expect(describeDay('2026-10-02', TODAY)).toBe('Tomorrow');
    expect(describeDay('2026-10-04', TODAY)).toBe('Sun');
    expect(describeDay('2026-10-17', TODAY)).toBe('Sat 17 Oct');
    expect(describeDue(todo('a'), TODAY, 0)).toBe('No deadline');
    expect(describeDue(todo('a', { dueDate: TODAY, dueTime: '18:00' }), TODAY, 600)).toBe('Today · 18:00');
    expect(describeDue(todo('a', { dueDate: TODAY, dueTime: '09:00' }), TODAY, 600)).toBe('Due 09:00 · late');
    expect(describeDue(todo('a', { dueDate: '2026-09-30' }), TODAY, 600)).toBe('Yesterday · late');
    expect(describeDue(todo('a', { dueDate: '2026-09-27' }), TODAY, 600)).toBe('4 days late');
  });

  it('offers quick deadlines and month grids', () => {
    expect(quickDueDates(TODAY).map((q) => q.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-08']);
    // On a Saturday, "Weekend" means the next one.
    expect(quickDueDates('2026-10-03')[2].date).toBe('2026-10-10');
    const oct = monthGrid(2026, 10);
    expect(oct.length % 7).toBe(0);
    expect(oct.slice(0, 4)).toEqual([null, null, null, '2026-10-01']); // Monday-first, the 1st is a Thursday
    expect(oct.filter(Boolean)).toHaveLength(31);
  });

  it('reminds at the deadline, or at 9:00 when there is no time', () => {
    const at = (date: string, h: number, m: number) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8), h, m);
    const plan = planNotifications({
      now: at(TODAY, 10, 0),
      today: TODAY,
      dayConfig: { timeZone: 'UTC', dayStartHour: 4 },
      habits: [],
      doneToday: new Set(),
      qualifiedToday: true,
      currentStreak: 0,
      streakAtRisk: { enabled: false, hour: 20 },
      focusEnd: { enabled: false, at: null },
      toInstant: at,
      todos: [
        todo('timed', { dueDate: TODAY, dueTime: '18:30' }),
        todo('allday', { dueDate: '2026-10-02' }),
        todo('past', { dueDate: TODAY, dueTime: '08:00' }),
        todo('done', { dueDate: '2026-10-02', doneAt: 1 }),
        todo('someday'),
        todo('far', { dueDate: '2026-12-01' }),
      ],
    });
    expect(plan.map((n) => [n.title, n.body, new Date(n.at).toISOString().slice(0, 16)])).toEqual([
      ['timed', 'Due now.', '2026-10-01T18:30'],
      ['allday', 'Due today.', '2026-10-02T09:00'],
    ]);
  });

  it('keeps today’s finished to-dos on Today, at the bottom', () => {
    const DAY = 86_400_000;
    const base = Date.UTC(2026, 9, 1, 12);
    const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const g = groupTodos(
      [
        todo('open', { dueDate: TODAY }),
        todo('late', { dueDate: '2026-09-29' }),
        todo('doneLate', { dueDate: '2026-09-29', doneAt: base + 2000 }),
        todo('doneDue', { dueDate: TODAY, doneAt: base - 3 * DAY }),
        todo('doneSomeday', { doneAt: base + 1000 }),
        todo('doneYesterday', { doneAt: base - DAY }),
        todo('doneTomorrowsTask', { dueDate: '2026-10-02', doneAt: base }),
      ],
      TODAY,
      600,
    );
    expect(todayTodos(g, TODAY, dayOf).map((t) => t.id)).toEqual([
      'late',
      'open',
      'doneDue',
      'doneTomorrowsTask',
      'doneSomeday',
      'doneLate',
    ]);
  });
});

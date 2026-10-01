import { addDays, daysBetween, LocalDate, weekday } from './dates';
import { parseTime } from './habit-input';

export const TODO_TITLE_MAX = 120;
export const TODO_NOTES_MAX = 500;

export interface Todo {
  id: string;
  title: string;
  notes?: string;
  /** Deadline day; none means "someday". */
  dueDate?: LocalDate;
  /** Optional time on the deadline day, "HH:MM" (24 h). */
  dueTime?: string;
  /** When it was ticked off (ms). */
  doneAt?: number;
  createdAt: number;
  /** Last change on any device (ms); settles sync conflicts. */
  updatedAt: number;
  /** Deleted to-dos stay as tombstones so other devices learn about the delete. */
  deletedAt?: number;
}

export interface TodoInput {
  title: string;
  notes?: string;
  dueDate?: LocalDate;
  dueTime?: string;
}

export function validateTodo(input: TodoInput): string | null {
  const title = input.title.trim();
  if (!title) return 'Give it a name.';
  if (title.length > TODO_TITLE_MAX) return `Keep it under ${TODO_TITLE_MAX} characters.`;
  if ((input.notes ?? '').length > TODO_NOTES_MAX) return `Notes can be up to ${TODO_NOTES_MAX} characters.`;
  if (input.dueTime && !input.dueDate) return 'Pick a day for the deadline first.';
  if (input.dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.dueTime)) return 'That time doesn’t look right.';
  return null;
}

export function normalizeTodo(input: TodoInput): TodoInput {
  const notes = input.notes?.trim();
  return {
    title: input.title.trim().replace(/\s+/g, ' '),
    notes: notes || undefined,
    dueDate: input.dueDate || undefined,
    dueTime: input.dueDate ? input.dueTime || undefined : undefined,
  };
}

/** Minutes since midnight, for comparing a deadline time with the clock. */
const minutesOf = (time: string) => {
  const { hour, minute } = parseTime(time);
  return hour * 60 + minute;
};

/**
 * Past its deadline and not done. `today` is the app's day (which starts at the day-start hour) and
 * `nowMinutes` the wall-clock minutes since midnight, used for deadlines with a time.
 */
export function isOverdue(t: Todo, today: LocalDate, nowMinutes: number, nowDate: LocalDate = today): boolean {
  if (t.doneAt || !t.dueDate) return false;
  if (daysBetween(t.dueDate, today) > 0) return true;
  // With a time, it's late once that time has passed on that calendar day.
  if (t.dueTime && t.dueDate === nowDate) return minutesOf(t.dueTime) <= nowMinutes;
  return t.dueTime ? daysBetween(t.dueDate, nowDate) > 0 : false;
}

export interface TodoGroups {
  overdue: Todo[];
  today: Todo[];
  upcoming: Todo[];
  someday: Todo[];
  done: Todo[];
}

const byDeadline = (a: Todo, b: Todo) =>
  (a.dueDate ?? '').localeCompare(b.dueDate ?? '') ||
  // Within a day, timed ones in order, then the ones without a time.
  (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99') ||
  a.createdAt - b.createdAt;

/** Splits live to-dos into the sections of the To-do screen, each in a sensible order. */
export function groupTodos(todos: Todo[], today: LocalDate, nowMinutes: number, nowDate: LocalDate = today): TodoGroups {
  const groups: TodoGroups = { overdue: [], today: [], upcoming: [], someday: [], done: [] };
  for (const t of todos) {
    if (t.deletedAt) continue;
    if (t.doneAt) groups.done.push(t);
    else if (isOverdue(t, today, nowMinutes, nowDate)) groups.overdue.push(t);
    else if (!t.dueDate) groups.someday.push(t);
    else if (t.dueDate === today) groups.today.push(t);
    else groups.upcoming.push(t);
  }
  groups.overdue.sort(byDeadline);
  groups.today.sort(byDeadline);
  groups.upcoming.sort(byDeadline);
  groups.someday.sort((a, b) => a.createdAt - b.createdAt);
  groups.done.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  return groups;
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today", "Tomorrow", "Fri", "Fri 17 Oct" — short day labels for deadlines and pickers. */
export function describeDay(date: LocalDate, today: LocalDate): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const [, m, d] = date.split('-').map(Number);
  const name = DAY[weekday(date)];
  if (diff > 1 && diff < 7) return name;
  return `${name} ${d} ${MONTH[m - 1]}`;
}

/** The deadline line under a to-do: "Today · 18:00", "2 days late", "No deadline". */
export function describeDue(t: Todo, today: LocalDate, nowMinutes: number, nowDate: LocalDate = today): string {
  if (!t.dueDate) return 'No deadline';
  const time = t.dueTime ? ` · ${t.dueTime}` : '';
  if (!t.doneAt && isOverdue(t, today, nowMinutes, nowDate)) {
    const late = daysBetween(t.dueDate, today);
    if (late <= 0) return `Due ${t.dueTime} · late`;
    return late === 1 ? `Yesterday${time} · late` : `${late} days late`;
  }
  return `${describeDay(t.dueDate, today)}${time}`;
}

/** Quick deadline choices: today, tomorrow, the coming Saturday, and a week from today. */
export function quickDueDates(today: LocalDate): { label: string; date: LocalDate }[] {
  const toSaturday = (6 - weekday(today) + 7) % 7 || 7;
  return [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'Weekend', date: addDays(today, toSaturday) },
    { label: 'Next week', date: addDays(today, 7) },
  ];
}

/** The days to draw for a month calendar: whole weeks, Monday first, padded with nulls. */
export function monthGrid(year: number, month: number): (LocalDate | null)[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const lead = (weekday(first) + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (LocalDate | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 0; d < days; d++) cells.push(addDays(first, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

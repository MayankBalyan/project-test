import { HabitKind, HabitEvent, Schedule } from './habits';
import type { Todo } from './todos';

/**
 * Pure sync rules, shared by every device:
 * - Habits, to-dos, settings and the running timer: last write wins, by `updatedAt` (ms on the device).
 * - Deleted habits and to-dos stay as tombstones (`deletedAt`) so other devices learn about the delete;
 *   a deleted habit's check-ins are dropped everywhere.
 * - Check-ins and focus sessions never change after they are made, so merging is a union by id.
 */

export interface SyncHabit {
  id: string;
  name: string;
  kind: HabitKind;
  target: number;
  schedule: Schedule;
  reminders?: string[];
  createdOn: string;
  archivedAt?: number;
  deletedAt?: number;
  updatedAt?: number;
}

export interface SyncSession {
  id: string;
  date: string;
  minutes: number;
  status: 'done' | 'given_up';
  tag: string;
  habitId?: string;
  createdAt: number;
}

export type SyncTodo = Todo;

export interface Versioned<T> {
  value: T;
  updatedAt: number;
}

export interface SyncState<S, F> {
  habits: SyncHabit[];
  events: HabitEvent[];
  sessions: SyncSession[];
  /** Optional so data saved before to-dos existed still loads. */
  todos?: SyncTodo[];
  settings: Versioned<S>;
  focus: Versioned<F | null>;
}

export interface Pulled<S, F> {
  habits: SyncHabit[];
  events: HabitEvent[];
  sessions: SyncSession[];
  todos?: SyncTodo[];
  settings: Versioned<S> | null;
  focus: Versioned<F | null> | null;
}

/** What still has to be sent to the server. Ids are kept until the server accepts them. */
export interface Outbox {
  habits: string[];
  events: string[];
  sessions: string[];
  todos: string[];
  settings: boolean;
  focus: boolean;
}

export const EMPTY_OUTBOX: Outbox = { habits: [], events: [], sessions: [], todos: [], settings: false, focus: false };

export type OutboxList = 'habits' | 'events' | 'sessions' | 'todos';

export function addToOutbox(o: Outbox, kind: OutboxList, ids: string[]): Outbox {
  return { ...o, [kind]: [...new Set([...(o[kind] ?? []), ...ids])] };
}

/** Everything on this device, e.g. on the first sign-in so local data joins the account. */
export function fullOutbox(state: SyncState<unknown, unknown>): Outbox {
  return {
    habits: state.habits.map((h) => h.id),
    events: state.events.map((e) => e.id),
    sessions: state.sessions.map((s) => s.id),
    todos: (state.todos ?? []).map((t) => t.id),
    settings: true,
    focus: true,
  };
}

/** Removes what the server accepted (or permanently rejected) from the outbox. */
export function clearSent(o: Outbox, sent: Outbox): Outbox {
  const drop = (ids: string[], done: string[]) => {
    const d = new Set(done);
    return ids.filter((id) => !d.has(id));
  };
  return {
    habits: drop(o.habits, sent.habits),
    events: drop(o.events, sent.events),
    sessions: drop(o.sessions, sent.sessions),
    todos: drop(o.todos ?? [], sent.todos ?? []),
    settings: o.settings && !sent.settings,
    focus: o.focus && !sent.focus,
  };
}

export function newer<T extends { updatedAt?: number }>(a: T, b: T): T {
  return (b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a;
}

export function unionById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const seen = new Set(local.map((x) => x.id));
  return [...local, ...remote.filter((x) => !seen.has(x.id))];
}

/** Last write wins per row; rows only one side has are kept. */
export function mergeNewest<T extends { id: string; updatedAt?: number }>(local: T[], remote: T[]): T[] {
  const byId = new Map(local.map((x) => [x.id, x]));
  for (const r of remote) {
    const l = byId.get(r.id);
    byId.set(r.id, l ? newer(l, r) : r);
  }
  return [...byId.values()];
}

/** Last write wins per habit; habits only one side has are kept. */
export function mergeHabits<H extends SyncHabit>(local: H[], remote: H[]): H[] {
  const byId = new Map(local.map((h) => [h.id, h]));
  for (const r of remote) {
    const l = byId.get(r.id);
    byId.set(r.id, l ? newer(l, r) : r);
  }
  return [...byId.values()];
}

/** Merges what the server sent into this device's state. Idempotent: applying it twice changes nothing. */
export function applyPulled<S, F>(state: SyncState<S, F>, pulled: Pulled<S, F>): SyncState<S, F> {
  const habits = mergeHabits(state.habits, pulled.habits);
  const deleted = new Set(habits.filter((h) => h.deletedAt).map((h) => h.id));

  return {
    habits,
    events: unionById(state.events, pulled.events).filter((e) => !deleted.has(e.habitId)),
    sessions: unionById(state.sessions, pulled.sessions),
    todos: mergeNewest(state.todos ?? [], pulled.todos ?? []),
    settings: pulled.settings ? newer(state.settings, pulled.settings) : state.settings,
    focus: pulled.focus ? newer(state.focus, pulled.focus) : state.focus,
  };
}

// Row mapping between the app and the database (snake_case columns).

export type HabitRow = {
  id: string;
  name: string;
  kind: HabitKind;
  target: number;
  schedule: Schedule;
  reminders: string[];
  created_on: string;
  archived_at: number | null;
  deleted_at: number | null;
  updated_at: number;
};

export function habitToRow(h: SyncHabit): HabitRow {
  return {
    id: h.id,
    name: h.name,
    kind: h.kind,
    target: h.target,
    schedule: h.schedule,
    reminders: h.reminders ?? [],
    created_on: h.createdOn,
    archived_at: h.archivedAt ?? null,
    deleted_at: h.deletedAt ?? null,
    updated_at: h.updatedAt ?? 0,
  };
}

export function rowToHabit(r: HabitRow): SyncHabit {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    target: r.target,
    schedule: r.schedule,
    reminders: r.reminders ?? [],
    createdOn: r.created_on,
    archivedAt: r.archived_at ?? undefined,
    deletedAt: r.deleted_at ?? undefined,
    updatedAt: Number(r.updated_at),
  };
}

export type EventRow = {
  id: string;
  habit_id: string;
  date: string;
  type: 'complete' | 'undo';
  value: number;
  created_at: number;
};

export const eventToRow = (e: HabitEvent): EventRow => ({
  id: e.id,
  habit_id: e.habitId,
  date: e.date,
  type: e.type,
  value: e.value,
  created_at: e.createdAt,
});

export const rowToEvent = (r: EventRow): HabitEvent => ({
  id: r.id,
  habitId: r.habit_id,
  date: r.date,
  type: r.type,
  value: r.value,
  createdAt: Number(r.created_at),
});

export type SessionRow = {
  id: string;
  date: string;
  minutes: number;
  status: 'done' | 'given_up';
  tag: string;
  habit_id: string | null;
  created_at: number;
};

export const sessionToRow = (s: SyncSession): SessionRow => ({
  id: s.id,
  date: s.date,
  minutes: s.minutes,
  status: s.status,
  tag: s.tag,
  habit_id: s.habitId ?? null,
  created_at: s.createdAt,
});

export const rowToSession = (r: SessionRow): SyncSession => ({
  id: r.id,
  date: r.date,
  minutes: r.minutes,
  status: r.status,
  tag: r.tag,
  habitId: r.habit_id ?? undefined,
  createdAt: Number(r.created_at),
});

export type TodoRow = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  due_time: string | null;
  done_at: number | null;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
};

export const todoToRow = (t: SyncTodo): TodoRow => ({
  id: t.id,
  title: t.title,
  notes: t.notes ?? null,
  due_date: t.dueDate ?? null,
  due_time: t.dueTime ?? null,
  done_at: t.doneAt ?? null,
  deleted_at: t.deletedAt ?? null,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
});

export const rowToTodo = (r: TodoRow): SyncTodo => ({
  id: r.id,
  title: r.title,
  notes: r.notes ?? undefined,
  dueDate: r.due_date ?? undefined,
  // Postgres `time` comes back as HH:MM:SS.
  dueTime: r.due_time ? r.due_time.slice(0, 5) : undefined,
  doneAt: r.done_at != null ? Number(r.done_at) : undefined,
  deletedAt: r.deleted_at != null ? Number(r.deleted_at) : undefined,
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
});

/**
 * Where to resume pulling. Rows are ordered by server time; going back a few seconds covers rows
 * committed slightly out of order, and merging is idempotent so seeing a row twice is harmless.
 */
export const CURSOR_OVERLAP_MS = 5_000;

export function nextCursor(previous: string | null, serverTimes: string[]): string | null {
  if (serverTimes.length === 0) return previous;
  const latest = Math.max(...serverTimes.map((t) => Date.parse(t)));
  const candidate = latest - CURSOR_OVERLAP_MS;
  const prev = previous ? Date.parse(previous) : -Infinity;
  return new Date(Math.max(candidate, prev)).toISOString();
}

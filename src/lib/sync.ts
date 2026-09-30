import type { SupabaseClient } from '@supabase/supabase-js';

import { HabitEvent } from '@/core/habits';
import {
  EMPTY_OUTBOX,
  EventRow,
  eventToRow,
  HabitRow,
  habitToRow,
  nextCursor,
  Outbox,
  Pulled,
  rowToEvent,
  rowToHabit,
  rowToSession,
  SessionRow,
  sessionToRow,
  SyncState,
  Versioned,
} from '@/core/sync';

export interface Cursors {
  habits: string | null;
  events: string | null;
  sessions: string | null;
  settings: string | null;
  focus: string | null;
}

export const EMPTY_CURSORS: Cursors = { habits: null, events: null, sessions: null, settings: null, focus: null };

export interface SyncResult<S, F> {
  pulled: Pulled<S, F>;
  /** Ids the server accepted, plus rows it permanently rejected (so they don't block forever). */
  sent: Outbox;
  rejected: number;
  cursors: Cursors;
}

// Rows sent in one request share one server timestamp, so pages must be larger than pushes:
// then paging by timestamp (>=) always makes progress.
const PUSH_CHUNK = 200;
const PAGE = 1000;

// Postgres errors that retrying won't fix: bad data or not allowed.
const permanent = (code?: string) => !!code && (code.startsWith('22') || code.startsWith('23') || code === '42501');

/**
 * Sends one table's pending rows. If the batch is refused, retries row by row so one bad row
 * can't hold back the rest. Network problems throw, leaving everything pending for next time.
 */
async function push<T extends { id: string }>(
  client: SupabaseClient,
  table: string,
  rows: T[],
  options: { onConflict: string; ignoreDuplicates: boolean },
): Promise<{ accepted: string[]; rejected: number }> {
  if (rows.length > PUSH_CHUNK) {
    let accepted: string[] = [];
    let rejected = 0;
    for (let i = 0; i < rows.length; i += PUSH_CHUNK) {
      const r = await push(client, table, rows.slice(i, i + PUSH_CHUNK), options);
      accepted = accepted.concat(r.accepted);
      rejected += r.rejected;
    }
    return { accepted, rejected };
  }
  if (rows.length === 0) return { accepted: [], rejected: 0 };
  const batch = await client.from(table).upsert(rows, options);
  if (!batch.error) return { accepted: rows.map((r) => r.id), rejected: 0 };
  if (!permanent(batch.error.code)) throw batch.error;
  const accepted: string[] = [];
  let rejected = 0;
  for (const row of rows) {
    const one = await client.from(table).upsert(row, options);
    if (!one.error) accepted.push(row.id);
    else if (permanent(one.error.code)) {
      accepted.push(row.id);
      rejected++;
    } else throw one.error;
  }
  return { accepted, rejected };
}

async function pullTable<R>(
  client: SupabaseClient,
  table: string,
  timeColumn: string,
  cursor: string | null,
): Promise<{ rows: R[]; cursor: string | null }> {
  const byKey = new Map<string, R>();
  let since = cursor;
  let times: string[] = [];
  for (;;) {
    let q = client.from(table).select('*').order(timeColumn, { ascending: true }).limit(PAGE);
    if (since) q = q.gte(timeColumn, since);
    const { data, error } = await q;
    if (error) throw error;
    const page = (data ?? []) as (R & Record<string, string>)[];
    // Pages overlap on the boundary timestamp; keep one copy of each row.
    for (const r of page) byKey.set(r.id ?? r.user_id, r);
    times = times.concat(page.map((r) => r[timeColumn]));
    const last = page[page.length - 1]?.[timeColumn];
    // A full page means there may be more; stop if the page didn't move us forward.
    if (page.length < PAGE || last === since) break;
    since = last;
  }
  const rows = [...byKey.values()];
  return { rows, cursor: nextCursor(cursor, times) };
}

/** One round trip: send what's pending, then fetch what changed elsewhere. */
export async function syncOnce<S, F>(
  client: SupabaseClient,
  state: SyncState<S, F>,
  outbox: Outbox,
  cursors: Cursors,
): Promise<SyncResult<S, F>> {
  const sent: Outbox = { ...EMPTY_OUTBOX };
  let rejected = 0;

  // Habits first: check-ins must point at a habit the server already has.
  const pendingHabits = new Set(outbox.habits);
  const habits = await push<HabitRow>(
    client,
    'habits',
    state.habits.filter((h) => pendingHabits.has(h.id)).map(habitToRow),
    { onConflict: 'id', ignoreDuplicates: false },
  );
  sent.habits = [...habits.accepted, ...outbox.habits.filter((id) => !state.habits.some((h) => h.id === id))];
  rejected += habits.rejected;

  const deleted = new Set(state.habits.filter((h) => h.deletedAt).map((h) => h.id));
  const pendingEvents = new Set(outbox.events);
  const events = await push<EventRow>(
    client,
    'habit_events',
    state.events.filter((e: HabitEvent) => pendingEvents.has(e.id) && !deleted.has(e.habitId)).map(eventToRow),
    { onConflict: 'id', ignoreDuplicates: true },
  );
  // Check-ins that no longer exist locally (their habit was deleted) are done too.
  const localEvents = new Set(state.events.map((e) => e.id));
  sent.events = [...events.accepted, ...outbox.events.filter((id) => !localEvents.has(id))];
  rejected += events.rejected;

  const pendingSessions = new Set(outbox.sessions);
  const sessions = await push<SessionRow>(
    client,
    'focus_sessions',
    state.sessions.filter((s) => pendingSessions.has(s.id)).map(sessionToRow),
    { onConflict: 'id', ignoreDuplicates: true },
  );
  sent.sessions = sessions.accepted;
  rejected += sessions.rejected;

  if (outbox.settings) {
    const { error } = await client
      .from('user_settings')
      .upsert({ data: state.settings.value, updated_at: state.settings.updatedAt }, { onConflict: 'user_id' });
    if (error && !permanent(error.code)) throw error;
    sent.settings = true;
  }
  if (outbox.focus) {
    const { error } = await client
      .from('active_focus')
      .upsert({ data: state.focus.value, updated_at: state.focus.updatedAt }, { onConflict: 'user_id' });
    if (error && !permanent(error.code)) throw error;
    sent.focus = true;
  }

  const h = await pullTable<HabitRow>(client, 'habits', 'server_updated_at', cursors.habits);
  const e = await pullTable<EventRow>(client, 'habit_events', 'server_inserted_at', cursors.events);
  const s = await pullTable<SessionRow>(client, 'focus_sessions', 'server_inserted_at', cursors.sessions);
  const st = await pullTable<{ data: S; updated_at: number }>(client, 'user_settings', 'server_updated_at', cursors.settings);
  const f = await pullTable<{ data: F | null; updated_at: number }>(client, 'active_focus', 'server_updated_at', cursors.focus);

  const versioned = <T>(rows: { data: T; updated_at: number }[]): Versioned<T> | null =>
    rows.length ? { value: rows[rows.length - 1].data, updatedAt: Number(rows[rows.length - 1].updated_at) } : null;

  return {
    pulled: {
      habits: h.rows.map(rowToHabit),
      events: e.rows.map(rowToEvent),
      sessions: s.rows.map(rowToSession),
      settings: versioned(st.rows),
      focus: versioned(f.rows),
    },
    sent,
    rejected,
    cursors: { habits: h.cursor, events: e.cursor, sessions: s.cursor, settings: st.cursor, focus: f.cursor },
  };
}

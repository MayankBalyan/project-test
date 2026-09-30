/**
 * Focus timer state is stored as timestamps, never as a ticking counter. Every device derives
 * the same countdown from it, and it stays correct after the app sleeps or is killed.
 */
export const MAX_PAUSES = 2;

export interface Pause {
  start: number;
  end?: number;
}

export interface TimerState {
  startedAt: number;
  plannedMs: number;
  pauses: Pause[];
}

export function startTimer(now: number, plannedMinutes: number): TimerState {
  return { startedAt: now, plannedMs: plannedMinutes * 60_000, pauses: [] };
}

export function isPaused(t: TimerState): boolean {
  const last = t.pauses[t.pauses.length - 1];
  return !!last && last.end === undefined;
}

function pausedMs(t: TimerState, now: number): number {
  return t.pauses.reduce((sum, p) => sum + ((p.end ?? now) - p.start), 0);
}

export function elapsedMs(t: TimerState, now: number): number {
  return Math.min(t.plannedMs, Math.max(0, now - t.startedAt - pausedMs(t, now)));
}

export function remainingMs(t: TimerState, now: number): number {
  return t.plannedMs - elapsedMs(t, now);
}

export function isFinished(t: TimerState, now: number): boolean {
  return remainingMs(t, now) === 0;
}

/** When the session will end if not paused again; used to schedule the end notification. */
export function endsAt(t: TimerState, now: number): number | null {
  return isPaused(t) ? null : now + remainingMs(t, now);
}

export function canPause(t: TimerState, now: number): boolean {
  return !isPaused(t) && !isFinished(t, now) && t.pauses.length < MAX_PAUSES;
}

export function pause(t: TimerState, now: number): TimerState {
  if (!canPause(t, now)) return t;
  return { ...t, pauses: [...t.pauses, { start: now }] };
}

export function resume(t: TimerState, now: number): TimerState {
  if (!isPaused(t)) return t;
  const pauses = t.pauses.slice(0, -1);
  pauses.push({ ...t.pauses[t.pauses.length - 1], end: now });
  return { ...t, pauses };
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

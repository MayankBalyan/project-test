import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { clearSent, EMPTY_OUTBOX, fullOutbox, Outbox, Pulled, SyncState } from '@/core/sync';
import { supabase } from '@/lib/supabase';
import { Cursors, EMPTY_CURSORS, syncOnce } from '@/lib/sync';

import { load, save } from './persist';

/** Which account the data on this device belongs to, and what still has to be sent. */
export interface SyncMeta {
  accountId: string | null;
  outbox: Outbox;
  cursors: Cursors;
  lastSyncedAt: number | null;
}

export const EMPTY_META: SyncMeta = { accountId: null, outbox: EMPTY_OUTBOX, cursors: EMPTY_CURSORS, lastSyncedAt: null };

export type SyncStatus =
  | { state: 'off' }
  | { state: 'syncing' }
  | { state: 'idle'; lastSyncedAt: number | null; rejected: number }
  | { state: 'error'; message: string; lastSyncedAt: number | null };

const AUTO_SYNC_MS = 60_000;
const DEBOUNCE_MS = 1_500;

export function useSyncMeta() {
  const [meta, setMeta] = useState<SyncMeta>(() => {
    const stored = load<Partial<SyncMeta>>('sync', {});
    // Fill in lists and cursors added in newer versions (e.g. to-dos).
    return {
      ...EMPTY_META,
      ...stored,
      outbox: { ...EMPTY_OUTBOX, ...stored.outbox },
      cursors: { ...EMPTY_CURSORS, ...stored.cursors },
    };
  });
  useEffect(() => save('sync', meta), [meta]);
  return [meta, setMeta] as const;
}

/**
 * Runs sync while someone is signed in: right after sign-in, shortly after each change, when the
 * app comes back to the foreground, and every minute. One run at a time; a request during a run
 * queues exactly one more.
 */
export function useSyncEngine<S, F>({
  userId,
  meta,
  setMeta,
  snapshot,
  applyPulled,
  onAccountSwitch,
}: {
  userId: string | null;
  meta: SyncMeta;
  setMeta: (update: (m: SyncMeta) => SyncMeta) => void;
  /** The latest local data, read when a run starts. */
  snapshot: () => SyncState<S, F>;
  applyPulled: (pulled: Pulled<S, F>) => void;
  /** Called when a different account signs in than the one this device's data belongs to. */
  onAccountSwitch: () => void;
}) {
  const [status, setStatus] = useState<SyncStatus>({ state: 'off' });
  const running = useRef(false);
  const again = useRef(false);
  const metaRef = useRef(meta);
  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  const run = useCallback(async () => {
    if (!supabase || !userId || metaRef.current.accountId !== userId) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setStatus({ state: 'syncing' });
    try {
      do {
        again.current = false;
        const m = metaRef.current;
        const sentState = snapshot();
        const result = await syncOnce(supabase, sentState, m.outbox, m.cursors);
        applyPulled(result.pulled);
        const at = Date.now();
        // Settings and the timer are single values: only mark them sent if they didn't change meanwhile.
        const latest = snapshot();
        const settingsSent = result.sent.settings && latest.settings.updatedAt === sentState.settings.updatedAt;
        const focusSent = result.sent.focus && latest.focus.updatedAt === sentState.focus.updatedAt;
        setMeta((cur) => {
          const next = {
            ...cur,
            outbox: clearSent(cur.outbox, { ...result.sent, settings: settingsSent, focus: focusSent }),
            cursors: result.cursors,
            lastSyncedAt: at,
          };
          metaRef.current = next;
          return next;
        });
        setStatus({ state: 'idle', lastSyncedAt: at, rejected: result.rejected });
      } while (again.current);
    } catch (e) {
      const message = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : 'Sync failed';
      setStatus({ state: 'error', message, lastSyncedAt: metaRef.current.lastSyncedAt });
    } finally {
      running.current = false;
    }
  }, [userId, snapshot, applyPulled, setMeta]);

  // Link this device's data to the signed-in account.
  useEffect(() => {
    if (!userId || meta.accountId === userId) return;
    if (meta.accountId && meta.accountId !== userId) {
      // Data here belongs to someone else's account: never upload it into this one.
      onAccountSwitch();
      setMeta(() => ({ ...EMPTY_META, accountId: userId }));
    } else {
      // First sign-in on this device: everything already here joins the account.
      setMeta(() => ({ ...EMPTY_META, accountId: userId, outbox: fullOutbox(snapshot()) }));
    }
  }, [userId, meta.accountId, onAccountSwitch, setMeta, snapshot]);

  // Sync soon after local changes.
  const pending =
    meta.outbox.habits.length + meta.outbox.events.length + meta.outbox.sessions.length + (meta.outbox.todos?.length ?? 0) +
    (meta.outbox.settings ? 1 : 0) + (meta.outbox.focus ? 1 : 0);
  const linked = !!userId && meta.accountId === userId;
  useEffect(() => {
    if (!linked) return;
    const id = setTimeout(run, pending > 0 ? DEBOUNCE_MS : 0);
    return () => clearTimeout(id);
  }, [linked, pending, run]);

  // And every minute, and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!linked) return;
    const id = setInterval(run, AUTO_SYNC_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [linked, run]);

  return { status: userId ? status : ({ state: 'off' } as SyncStatus), syncNow: run, pending };
}

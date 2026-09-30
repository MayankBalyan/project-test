import type { PlannedNotification } from '@/core/notify-plan';

export type Permission = 'granted' | 'denied' | 'undetermined';

/** Browsers can only show these while Istel is open in a tab (no background scheduling). */
export const notificationReach: 'always' | 'while-open' = 'while-open';

const supported = () => typeof window !== 'undefined' && 'Notification' in window;
let timers: ReturnType<typeof setTimeout>[] = [];

export async function getPermission(): Promise<Permission> {
  if (!supported()) return 'denied';
  const p = Notification.permission;
  return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'undetermined';
}

export async function requestPermission(): Promise<boolean> {
  if (!supported()) return false;
  return (await Notification.requestPermission()) === 'granted';
}

// setTimeout can't wait longer than ~24.8 days; the plan never looks that far ahead anyway.
const MAX_DELAY = 2 ** 31 - 1;

export async function applyPlan(plan: PlannedNotification[]) {
  timers.forEach(clearTimeout);
  timers = [];
  if ((await getPermission()) !== 'granted') return;
  const now = Date.now();
  for (const n of plan) {
    const delay = n.at - now;
    if (delay <= 0 || delay > MAX_DELAY) continue;
    timers.push(setTimeout(() => new Notification(n.title, { body: n.body, tag: n.id }), delay));
  }
}

import { toLocalDate } from '@/core/dates';
import { useNow } from '@/state/store';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The wall clock for deadlines: calendar date and minutes since midnight, refreshed every 30 seconds. */
export function useClock() {
  const now = useNow(true, 30_000);
  const d = new Date(now);
  return {
    nowDate: toLocalDate(d, { timeZone, dayStartHour: 0 }),
    nowMinutes: d.getHours() * 60 + d.getMinutes(),
  };
}

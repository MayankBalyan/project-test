import { dailyValues, HabitEvent } from './habits';

export const EXPORT_VERSION = 1;

export interface ExportInput {
  exportedAt: string;
  settings: object;
  habits: { id: string; name: string }[];
  events: HabitEvent[];
  sessions: { date: string; minutes: number; status: string; tag: string }[];
}

/** Everything Rootline stores, as one JSON document the user can keep or import later. */
export function toJsonExport(data: ExportInput): string {
  return JSON.stringify({ app: 'rootline', version: EXPORT_VERSION, ...data }, null, 2);
}

function cell(value: string | number): string {
  const s = String(value);
  // Quote cells with separators or quotes, and neutralize spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * One row per habit per day with a value, and one row per focus session, sorted by date.
 * Columns: date, type, name, value, status.
 */
export function toCsvExport(data: ExportInput): string {
  const rows: (string | number)[][] = [];
  for (const h of data.habits) {
    const values = dailyValues(data.events.filter((e) => e.habitId === h.id));
    for (const [date, value] of values) if (value > 0) rows.push([date, 'habit', h.name, value, 'done']);
  }
  for (const s of data.sessions) rows.push([s.date, 'focus', s.tag, s.minutes, s.status]);
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return [['date', 'type', 'name', 'value', 'status'], ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}

import type { Task, Booking } from '../api/schemas';
import { addDays, dayKey, todayKey, toDate } from './time';

export type Slot = { kind: 'meeting'; at: string; booking: Booking } | { kind: 'task'; at: string; task: Task; late: boolean };
export type AgendaDay = { day: string; slots: Slot[] };

/**
 * «يومي»: late tasks first (under today), then each of the next `days` days with its meetings and tasks,
 * meetings by time, tasks after them. Done tasks of today stay visible (crossed out). Pure.
 */
export function buildAgenda(tasks: Task[], bookings: Booking[], opts: { me?: string; mineOnly?: boolean; days?: number; today?: string } = {}): AgendaDay[] {
  const today = opts.today || todayKey();
  const span = opts.days ?? 7;
  const last = addDays(today, span - 1);
  const mine = (owner: string) => !opts.mineOnly || !owner || owner === opts.me;
  const map = new Map<string, Slot[]>();
  const push = (d: string, s: Slot) => { const a = map.get(d) || []; a.push(s); map.set(d, a); };
  tasks.forEach((t) => {
    if (!mine(t.owner)) return;
    const d = dayKey(t.due);
    if (!d) return;
    if (t.status === 'مفتوحة' && d < today) push(today, { kind: 'task', at: t.due, task: t, late: true });
    else if (d >= today && d <= last && (t.status === 'مفتوحة' || (t.status === 'تمت' && d === today))) push(d, { kind: 'task', at: t.due, task: t, late: false });
  });
  bookings.forEach((b) => {
    const at = b.startIso || b.start;
    const d = dayKey(at);
    if (d >= today && d <= last && b.status !== 'ملغي') push(d, { kind: 'meeting', at, booking: b });
  });
  const order = (s: Slot) => (s.kind === 'task' && s.late ? 0 : s.kind === 'meeting' ? 1 : 2);
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, slots]) => ({
    day,
    slots: slots.sort((a, b) => order(a) - order(b) || (toDate(a.at)?.getTime() || 0) - (toDate(b.at)?.getTime() || 0))
  }));
}

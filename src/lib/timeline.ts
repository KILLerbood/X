import type { Activity, Task, Booking } from '../api/schemas';
import { dayKey, toDate } from './time';

export type Bubble =
  | { type: 'activity'; id: string; at: string; side: 'me' | 'them' | 'center'; kind: string; text: string; details: string; by: string }
  | { type: 'task'; id: string; at: string; side: 'center'; task: Task }
  | { type: 'meeting'; id: string; at: string; side: 'center'; booking: Booking };
export type Day = { day: string; items: Bubble[] };

/**
 * The conversation: every activity becomes a bubble (outgoing on my side, incoming on theirs,
 * system events and stage changes in the middle), plus meetings and open tasks as cards. Grouped by day, oldest first.
 */
export function buildTimeline(activities: Activity[], tasks: Task[], bookings: Booking[]): Day[] {
  const items: Bubble[] = [];
  activities.forEach((a) => {
    const side = a.kind === 'تغيير مرحلة' || a.kind === 'نظام' ? 'center' : a.direction === 'وارد' ? 'them' : 'me';
    items.push({ type: 'activity', id: a.id, at: a.date, side, kind: a.kind, text: a.summary, details: a.details, by: a.by });
  });
  bookings.forEach((b) => { if (toDate(b.startIso || b.start)) items.push({ type: 'meeting', id: b.id, at: b.startIso || b.start, side: 'center', booking: b }); });
  tasks.filter((t) => t.status === 'مفتوحة').forEach((t) => items.push({ type: 'task', id: t.id, at: t.due || t.created, side: 'center', task: t }));
  items.sort((a, b) => (toDate(a.at)?.getTime() || 0) - (toDate(b.at)?.getTime() || 0));
  const days: Day[] = [];
  items.forEach((it) => {
    const d = dayKey(it.at);
    const last = days[days.length - 1];
    if (last && last.day === d) last.items.push(it); else days.push({ day: d, items: [it] });
  });
  return days;
}

import type { Lead, Task, Booking } from '../api/schemas';
import { dayKey, todayKey, daysBetween, toDate } from './time';
import { ACTIVE } from '../api/schemas';

/** Why a conversation is waiting on you. Highest first. */
export type Waiting = 'overdue' | 'today' | 'new' | 'stale' | null;
export type Conv = { lead: Lead; waiting: Waiting; due: string; openTasks: number; nextMeeting: Booking | null; last: string; reason: string };

export const FILTERS = [
  { id: 'waiting', label: 'مستنيين ردّك' },
  { id: 'today', label: 'النهارده' },
  { id: 'new', label: 'جداد' },
  { id: 'road', label: 'في الطريق' },
  { id: 'clients', label: 'عملاء' },
  { id: 'all', label: 'الكل' }
] as const;
export type FilterId = (typeof FILTERS)[number]['id'];

const RANK: Record<string, number> = { overdue: 0, today: 1, new: 2, stale: 3 };

/** Builds one conversation per lead: what's waiting, the earliest due date, the next meeting. Pure. */
export function conversations(leads: Lead[], tasks: Task[], bookings: Booking[], staleDays = 7, today = todayKey()): Conv[] {
  const open = new Map<string, Task[]>();
  tasks.forEach((t) => { if (t.status === 'مفتوحة' && t.leadId) { const a = open.get(t.leadId) || []; a.push(t); open.set(t.leadId, a); } });
  const meet = new Map<string, Booking>();
  const nowMs = Date.now();
  bookings.forEach((b) => {
    const d = toDate(b.startIso || b.start);
    if (!d || d.getTime() < nowMs - 2 * 3600e3 || ['ملغي', 'تم', 'لم يحضر'].includes(b.status)) return;
    const cur = meet.get(b.leadId);
    if (!cur || (toDate(cur.startIso || cur.start)?.getTime() || 0) > d.getTime()) meet.set(b.leadId, b);
  });
  return leads.map((lead) => {
    const ts = open.get(lead.id) || [];
    const dues = [lead.nextFollowUp, ...ts.map((t) => t.due)].map(dayKey).filter(Boolean).sort();
    const due = dues[0] || '';
    const nm = meet.get(lead.id) || null;
    let waiting: Waiting = null, reason = '';
    if (due && due < today) { waiting = 'overdue'; reason = 'متأخر ' + daysBetween(due, today) + ' يوم'; }
    else if (due === today || (nm && dayKey(nm.startIso || nm.start) === today)) { waiting = 'today'; reason = nm && dayKey(nm.startIso || nm.start) === today ? 'اجتماع النهارده' : 'متابعة النهارده'; }
    else if ((lead.stage === 'جديد' || !lead.stage) && !lead.firstReply) { waiting = 'new'; reason = 'لسه محدش كلّمه'; }
    else if (ACTIVE.includes(lead.stage) && lead.lastContact && daysBetween(dayKey(lead.lastContact), today) >= staleDays) { waiting = 'stale'; reason = 'ساكت من ' + daysBetween(dayKey(lead.lastContact), today) + ' يوم'; }
    const last = [lead.lastContact, lead.updated, lead.created].filter(Boolean).sort().reverse()[0] || '';
    return { lead, waiting, due, openTasks: ts.length, nextMeeting: nm, last, reason };
  });
}

export function filterConvs(convs: Conv[], f: FilterId): Conv[] {
  const out = convs.filter((c) => {
    const st = c.lead.stage;
    switch (f) {
      case 'waiting': return c.waiting !== null;
      case 'today': return c.waiting === 'today' || c.waiting === 'overdue';
      case 'new': return st === 'جديد' || !st;
      case 'road': return ACTIVE.includes(st);
      case 'clients': return st === 'عميل نشط';
      default: return true;
    }
  });
  return sortConvs(out, f === 'waiting' || f === 'today');
}
/** Waiting first (overdue → today → new → stale), then most recent activity. */
export function sortConvs(convs: Conv[], byWaiting = true): Conv[] {
  return convs.slice().sort((a, b) => {
    if (byWaiting) {
      const ra = a.waiting ? RANK[a.waiting] : 9, rb = b.waiting ? RANK[b.waiting] : 9;
      if (ra !== rb) return ra - rb;
      if (a.waiting === 'overdue' && a.due !== b.due) return a.due < b.due ? -1 : 1;
    }
    return a.last < b.last ? 1 : a.last > b.last ? -1 : 0;
  });
}
export const counts = (convs: Conv[]) => Object.fromEntries(
  (['waiting', 'today', 'new', 'road', 'clients', 'all'] as FilterId[]).map((f) => [f, filterConvs(convs, f).length])
) as Record<FilterId, number>;

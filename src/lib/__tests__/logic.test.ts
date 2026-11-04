import { describe, it, expect } from 'vitest';
import { conversations, filterConvs, counts, sortConvs } from '../inbox';
import { buildTimeline } from '../timeline';
import { fill, forChannel, waLink } from '../templates';
import { fold, score, search, phoneKey } from '../arabic';
import { nextStage, stepOf, progress, stageTone, suggestions, isOffRoad } from '../journey';
import { buildAgenda } from '../agenda';
import { delta, lastDays, funnelShares, forecast } from '../metrics';
import { summarize } from '../../lib/money';
import { relDay, ago, initials, hueOf, compact, latinDigits } from '../format';
import { addDays, todayKey } from '../time';
import type { Lead, Task, Booking, Activity, Template, Invoice, Quote, Payment } from '../../api/schemas';

const T = todayKey();
const iso = (d: string) => d + 'T09:00:00.000Z';
const lead = (p: Partial<Lead>): Lead => ({
  id: 'L-1', created: iso(addDays(T, -30)), type: '', stage: 'جديد', priority: '', score: null, name: 'فهد', business: 'معرض الفخامة', businessType: '', city: 'الرياض', country: '', phone: '+966551234567', email: '', link: '',
  service: '', source: '', utmSource: '', utmMedium: '', utmCampaign: '', readiness: null, owner: 'عبد الله', dealValue: null, mrr: null, clientSince: '', renewal: '', firstReply: '', lastContact: '',
  nextFollowUp: '', lostReason: '', notes: '', lang: '', updated: '', ...p
} as Lead);
const task = (p: Partial<Task>): Task => ({ id: 'T-1', created: '', leadId: 'L-1', leadName: '', task: 'كلّمه', due: iso(T), owner: 'عبد الله', status: 'مفتوحة', doneAt: '', ...p } as Task);
const booking = (p: Partial<Booking>): Booking => ({ id: 'M-1', leadId: 'L-1', created: '', name: '', business: 'معرض', phone: '', email: '', meetingType: 'تعارف', start: '', startIso: iso(addDays(T, 1)), platform: '', meetLink: '', eventId: '', status: 'مؤكد', clientNotes: '', outcome: '', reminder: '', lang: '', ...p } as Booking);

describe('inbox', () => {
  it('flags overdue, today, new and stale, in that order', () => {
    const leads = [
      lead({ id: 'A', stage: 'تم التواصل', firstReply: iso(T), lastContact: iso(addDays(T, -20)) }),
      lead({ id: 'B', stage: 'تم التواصل', firstReply: iso(T), nextFollowUp: iso(addDays(T, -3)) }),
      lead({ id: 'C', stage: 'جديد' }),
      lead({ id: 'D', stage: 'عرض مرسل', firstReply: iso(T), lastContact: iso(T) }),
      lead({ id: 'E', stage: 'تفاوض', firstReply: iso(T), lastContact: iso(T) })
    ];
    const convs = conversations(leads, [task({ leadId: 'D', due: iso(T) })], [], 7, T);
    const w = Object.fromEntries(convs.map((c) => [c.lead.id, c.waiting]));
    expect(w).toEqual({ A: 'stale', B: 'overdue', C: 'new', D: 'today', E: null });
    expect(filterConvs(convs, 'waiting').map((c) => c.lead.id)).toEqual(['B', 'D', 'C', 'A']);
    expect(convs.find((c) => c.lead.id === 'B')!.reason).toBe('متأخر 3 يوم');
  });
  it('counts each filter and ignores done tasks', () => {
    const convs = conversations([lead({ id: 'A', stage: 'عميل نشط', firstReply: iso(T) }), lead({ id: 'B', stage: 'تفاوض', firstReply: iso(T), lastContact: iso(T) })], [task({ leadId: 'B', status: 'تمت', due: iso(addDays(T, -2)) })], [], 7, T);
    const n = counts(convs);
    expect(n.clients).toBe(1); expect(n.road).toBe(1); expect(n.waiting).toBe(0); expect(n.all).toBe(2);
  });
  it('finds the next meeting and marks a meeting today', () => {
    const convs = conversations([lead({ firstReply: iso(T), stage: 'اجتماع محجوز' })], [], [booking({ startIso: new Date(Date.now() + 3600e3).toISOString() }), booking({ id: 'M-2', startIso: iso(addDays(T, 5)) })], 7);
    expect(convs[0].nextMeeting?.id).toBe('M-1');
    expect(convs[0].waiting).toBe('today');
  });
  it('sorts by latest activity when not waiting', () => {
    const a = conversations([lead({ id: 'old', updated: iso(addDays(T, -5)), firstReply: 'x' }), lead({ id: 'new', updated: iso(T), firstReply: 'x' })], [], [], 7, T);
    expect(sortConvs(a, false).map((c) => c.lead.id)).toEqual(['new', 'old']);
  });
});

describe('timeline', () => {
  const act = (p: Partial<Activity>): Activity => ({ id: 'A1', date: iso(T), leadId: 'L-1', leadName: '', kind: 'ملاحظة', direction: 'داخلي', summary: 'x', details: '', by: 'عبد الله', ...p } as Activity);
  it('puts outgoing on my side, incoming on theirs, stage changes in the middle, grouped by day', () => {
    const days = buildTimeline([
      act({ id: '1', direction: 'صادر', kind: 'واتساب', date: iso(addDays(T, -1)) }),
      act({ id: '2', direction: 'وارد', kind: 'واتساب' }),
      act({ id: '3', kind: 'تغيير مرحلة' })
    ], [task({ due: iso(addDays(T, 1)) }), task({ id: 'T-2', status: 'تمت' })], [booking({})]);
    expect(days.map((d) => d.day)).toEqual([addDays(T, -1), T, addDays(T, 1)]);
    const sides = days.flatMap((d) => d.items.map((i) => i.side));
    expect(sides.slice(0, 3)).toEqual(['me', 'them', 'center']);
    expect(days.flatMap((d) => d.items).filter((i) => i.type === 'task')).toHaveLength(1);
  });
});

describe('templates', () => {
  const tpl = (p: Partial<Template>): Template => ({ id: 'T1', channel: 'واتساب', name: 'x', stage: '', subject: '', body: '', active: true, ...p } as Template);
  it('fills known variables and leaves unknown ones visible', () => {
    expect(fill('أهلاً {{الاسم}} من {{النشاط}}، معك {{المرسل}} {{غريب}}', lead({ name: 'فهد المطيري' }), { me: 'عبد الله' })).toBe('أهلاً فهد من معرض الفخامة، معك عبد الله {{غريب}}');
  });
  it('lists the stage templates first and skips inactive ones', () => {
    const list = forChannel([tpl({ id: 'a', stage: 'جديد' }), tpl({ id: 'b', stage: 'عرض مرسل' }), tpl({ id: 'c', active: false }), tpl({ id: 'd', channel: 'إيميل' })], 'واتساب', 'عرض مرسل');
    expect(list.map((t) => t.id)).toEqual(['b', 'a']);
  });
  it('builds a wa.me link only for a real number', () => {
    expect(waLink('+966 55 123 4567', 'أهلاً')).toBe('https://wa.me/966551234567?text=' + encodeURIComponent('أهلاً'));
    expect(waLink('', 'x')).toBe('');
  });
});

describe('arabic search', () => {
  it('folds hamza, ta marbuta, alef maqsura and tashkeel', () => {
    expect(fold('إبراهيم')).toBe('ابراهيم'); expect(fold('مدرسة')).toBe('مدرسه'); expect(fold('مصطفى')).toBe('مصطفي'); expect(fold('مُحَمَّد')).toBe('محمد'); expect(fold('٠١٢')).toBe('012');
  });
  it('matches phones in any format and ranks name starts higher', () => {
    const a = lead({ id: 'a', business: 'الفخامة', name: '' }), b = lead({ id: 'b', business: 'بيت', name: 'قصر الفخامة', phone: '0551112222' });
    expect(score(b, '1112222')).toBe(90);
    expect(phoneKey('00966 55 111 2222')).toBe(phoneKey('0551112222'));
    expect(search([b, a], 'فخامه').map((x) => x.id)).toEqual(['a', 'b']);
    expect(search([a, b], 'غير موجود')).toEqual([]);
  });
});

describe('journey', () => {
  it('walks the road and knows what is off it', () => {
    expect(nextStage('جديد')).toBe('تم التواصل'); expect(nextStage('عميل نشط')).toBeNull(); expect(nextStage('خسرناه')).toBeNull();
    expect(stepOf('عرض مرسل')).toBe(4); expect(progress('عميل نشط')).toBe(1); expect(isOffRoad('متوقف')).toBe(true);
    expect(stageTone('عميل نشط')).toBe('won'); expect(stageTone('تفاوض')).toBe('hot'); expect(stageTone('')).toBe('new');
    expect(suggestions('عرض مرسل')[0].template).toBe('متابعة بعد العرض');
  });
});

describe('agenda', () => {
  it('pulls late tasks into today, keeps done-today, filters by owner', () => {
    const days = buildAgenda([
      task({ id: 'late', due: iso(addDays(T, -2)) }),
      task({ id: 'done', status: 'تمت', due: iso(T) }),
      task({ id: 'later', due: iso(addDays(T, 3)) }),
      task({ id: 'far', due: iso(addDays(T, 30)) }),
      task({ id: 'other', owner: 'نور حسن', due: iso(T) })
    ], [booking({ startIso: iso(T) }), booking({ id: 'x', status: 'ملغي', startIso: iso(T) })], { me: 'عبد الله', mineOnly: true, today: T });
    expect(days[0].day).toBe(T);
    expect(days[0].slots.map((s) => (s.kind === 'task' ? s.task.id : s.booking.id))).toEqual(['late', 'M-1', 'done']);
    expect(days.map((d) => d.day)).toEqual([T, addDays(T, 3)]);
  });
});

describe('metrics + money', () => {
  it('computes deltas, ranges, funnel shares and the weighted forecast', () => {
    expect(delta(15, 10)).toEqual({ pct: 50, dir: 'up' }); expect(delta(5, 10)).toEqual({ pct: 50, dir: 'down' }); expect(delta(0, 0)).toBeNull();
    expect(lastDays(7, '2026-11-03')).toEqual({ from: '2026-10-28', to: '2026-11-03' });
    expect(funnelShares([{ count: 10 }, { count: 5 }, { count: 0 }])).toEqual([1, 0.5, 0]);
    expect(forecast([{ stage: 'تفاوض', value: 1000 }, { stage: 'جديد', value: 500 }])).toBe(700);
  });
  it('summarizes what is owed, late and collected', () => {
    const now = Date.parse('2026-11-15T12:00:00Z');
    const inv = (p: Partial<Invoice>) => ({ id: 'i', status: 'مرسلة', amount: 100, balance: 100, paid: 0, dueDate: '2026-11-20', overdue: false, ...p } as Invoice);
    const s = summarize({
      invoices: [inv({}), inv({ dueDate: '2026-11-01', balance: 60, paid: 40 }), inv({ status: 'مدفوعة', balance: 0 })],
      quotes: [{ status: 'مرسل' } as Quote, { status: 'مقبول' } as Quote],
      payments: [{ amount: 40, date: '2026-11-02', created: '' } as Payment, { amount: 99, date: '2026-10-02', created: '' } as Payment]
    }, now);
    expect(s).toEqual({ outstanding: 160, late: 60, lateCount: 1, collected: 40, pendingQuotes: 1 });
  });
});

describe('format', () => {
  it('speaks Egyptian about days', () => {
    expect(relDay(iso(T), T)).toBe('النهارده'); expect(relDay(iso(addDays(T, 1)), T)).toBe('بكرة'); expect(relDay(iso(addDays(T, -2)), T)).toBe('من يومين'); expect(relDay(iso(addDays(T, 4)), T)).toBe('بعد 4 أيام');
    expect(ago(new Date(Date.now() - 5 * 60e3).toISOString())).toBe('5 د');
  });
  it('makes initials, stable hues and compact numbers', () => {
    expect(initials('معرض الفخامة للأثاث')).toBe('ف'); expect(initials('Casa Living')).toBe('CL');
    expect(hueOf('x')).toBe(hueOf('x')); expect(compact(25300)).toBe('25K'); expect(compact(1_250_000)).toBe('1.3M'); expect(latinDigits('١٢٣')).toBe('123');
  });
});

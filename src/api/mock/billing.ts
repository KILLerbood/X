// Demo quotes, invoices and payments (VITE_MOCK=1 only). The real ones live in the sheet (Api.gs §13).
import { store } from '../../lib/storage';
import { DAY } from '../../lib/time';

type Row = Record<string, unknown>;
type Lead = Record<string, string | number>;
type Me = { name: string; isAdmin: boolean };
type BillDb = { quotes: Row[]; invoices: Row[]; payments: Row[]; seq: number };
const KEY = 'crmx-mock-billing-v1';
const iso = (ms: number) => new Date(ms).toISOString();
const s = (v: unknown) => (v == null ? '' : String(v));

const ITEMS: Record<string, [string, number, boolean][]> = {
  'دراسة السوق': [['دراسة سوق ومنافسين', 1800, false]],
  'المحتوى والإعلانات': [['إدارة محتوى وإعلانات (شهري)', 1200, true], ['جلسة تصوير منتجات', 600, false]],
  'المواقع والمعارض 3D': [['معرض 3D تفاعلي', 3500, false], ['استضافة وصيانة (شهري)', 150, true]],
  'الاستشارات': [['ساعات استشارة (8 ساعات)', 960, false]],
  'باقة متكاملة': [['الباقة المتكاملة (شهري)', 2400, true], ['تجهيز وإطلاق', 1500, false]]
};

function seed(leads: Lead[]): BillDb {
  const db: BillDb = { quotes: [], invoices: [], payments: [], seq: 0 };
  const now = Date.now();
  leads.filter((l) => ['عرض مرسل', 'تفاوض', 'فترة تجريبية', 'عميل نشط'].includes(s(l.stage))).forEach((l, i) => {
    const items = (ITEMS[s(l.service)] || ITEMS['الاستشارات']).map(([title, unit, monthly]) => ({ serviceId: '', title, titleEn: '', desc: '', qty: 1, unit, discountPct: 0, monthly }));
    const total = items.reduce((a, x) => a + x.unit, 0);
    const monthly = items.filter((x) => x.monthly).reduce((a, x) => a + x.unit, 0) || null;
    const won = s(l.stage) === 'عميل نشط' || s(l.stage) === 'فترة تجريبية';
    const qid = 'Q-' + String(++db.seq).padStart(4, '0');
    const date = now - (20 + i * 3) * DAY;
    db.quotes.push({
      id: qid, date: iso(date), leadId: l.id, leadName: l.business || l.name, status: won ? 'مقبول' : i % 3 === 0 ? 'اتفتح' : 'مرسل', total, monthly, currency: 'USD',
      validUntil: iso(date + 14 * DAY), sentAt: iso(date + 3600e3), openedAt: i % 3 === 0 || won ? iso(date + DAY) : '', decidedAt: won ? iso(date + 4 * DAY) : '', rejectReason: '',
      subscription: won && monthly ? 'نشط' : '', nextMonthly: '', by: s(l.owner) || 'عبد الله', link: '#doc/' + qid, data: { client: { business: s(l.business), contact: s(l.name) }, items }
    });
    if (won) {
      const paidAll = i % 2 === 0;
      [['دفعة أولى 50%', 0.5, -12], ['الدفعة الثانية', 0.5, i % 3 === 0 ? -3 : 6]].forEach(([label, part, dueIn], k) => {
        const amount = Math.round(total * Number(part));
        const id = 'INV-' + String(++db.seq).padStart(4, '0');
        const paid = k === 0 || paidAll ? amount : 0;
        const due = now + Number(dueIn) * DAY;
        db.invoices.push({ id, date: iso(date + 5 * DAY), leadId: l.id, leadName: l.business || l.name, quoteId: qid, label, status: paid >= amount ? 'مدفوعة' : 'مرسلة', amount, paid, balance: amount - paid, currency: 'USD', dueDate: iso(due), readyOn: '', sentAt: iso(date + 5 * DAY), by: 'عبد الله', link: '#doc/' + id, overdue: paid < amount && due < now, data: {} });
        if (paid) db.payments.push({ id: 'P-' + String(++db.seq).padStart(4, '0'), created: iso(date + 7 * DAY), date: iso(date + 7 * DAY), invoiceId: id, leadId: l.id, leadName: l.business || l.name, amount: paid, currency: 'USD', method: 'تحويل بنكي', ref: '', fromName: s(l.name), fromAccount: '', note: '', fileId: '', by: 'عبد الله' });
      });
    }
  });
  return db;
}

let bdb: BillDb | null = store.json<BillDb | null>(KEY, null);
const get = (leads: () => Lead[]) => (bdb ||= seed(leads()));
const save = () => store.setJson(KEY, bdb);
const refresh = (inv: Row) => { const bal = Number(inv.amount) - Number(inv.paid || 0); inv.balance = bal; inv.status = bal <= 0 ? 'مدفوعة' : Number(inv.paid) > 0 ? 'مدفوعة جزئيًا' : inv.status === 'جاهزة' ? 'جاهزة' : 'مرسلة'; inv.overdue = bal > 0 && Date.parse(s(inv.dueDate)) < Date.now(); };
const err = (m: string) => { throw Object.assign(new Error(m), { code: 'APP_ERROR' }); };

/** Billing functions of the demo gateway. Each returns `data` or throws an Arabic error. */
export function billingApi(leads: () => Lead[], onLog: (leadId: string, summary: string, me: Me) => void): Record<string, (me: Me, ...a: never[]) => unknown> {
  return {
    crmBilling: (_me: Me, q: { leadId?: string } = {}) => {
      const d = get(leads);
      d.invoices.forEach(refresh);
      const f = (r: Row) => !q?.leadId || r.leadId === q.leadId;
      return { quotes: d.quotes.filter(f), invoices: d.invoices.filter(f), payments: d.payments.filter(f), settings: { currency: 'USD', autoSend: false, dueDays: 7, quoteDays: 14, from: { name: 'Magmafy' }, payment: {}, termsQuote: [], termsInvoice: [] } };
    },
    crmServices: () => [],
    crmRecordPayment: (me: Me, invoiceId: string, p: { amount?: number; method?: string; date?: string; note?: string }) => {
      const d = get(leads);
      const inv = d.invoices.find((x) => x.id === invoiceId) || err('الفاتورة غير موجودة');
      const amount = Math.round(Number(p?.amount) || 0);
      if (amount <= 0) err('اكتب مبلغ صحيح');
      if (amount > Number(inv!.balance)) err('المبلغ أكبر من المتبقي (' + inv!.balance + ')');
      inv!.paid = Number(inv!.paid || 0) + amount;
      refresh(inv!);
      d.payments.push({ id: 'P-' + String(++d.seq).padStart(4, '0'), created: iso(Date.now()), date: p?.date || iso(Date.now()), invoiceId, leadId: inv!.leadId, leadName: inv!.leadName, amount, currency: 'USD', method: s(p?.method) || 'تحويل بنكي', ref: '', fromName: '', fromAccount: '', note: s(p?.note), fileId: '', by: me.name });
      onLog(s(inv!.leadId), 'دفعة ' + amount + ' USD على ' + invoiceId, me);
      save();
      return { ok: true, invoice: inv, emailed: false, emailError: '' };
    },
    crmDecideQuote: (me: Me, id: string, decision: string, reason: string) => {
      const d = get(leads);
      const q = d.quotes.find((x) => x.id === id) || err('العرض غير موجود');
      q!.status = decision === 'accept' ? 'مقبول' : 'مرفوض';
      q!.decidedAt = iso(Date.now()); q!.rejectReason = decision === 'accept' ? '' : s(reason);
      onLog(s(q!.leadId), (decision === 'accept' ? 'العرض اتقبل: ' : 'العرض اترفض: ') + id, me);
      save();
      return { ok: true };
    },
    crmSendDoc: (me: Me, kind: string, id: string, channel: string) => {
      const d = get(leads);
      const r = (kind === 'quote' ? d.quotes : d.invoices).find((x) => x.id === id) || err('المستند غير موجود');
      r!.sentAt = iso(Date.now());
      if (kind === 'quote' && r!.status === 'مسودة') r!.status = 'مرسل';
      onLog(s(r!.leadId), 'اتبعت ' + (kind === 'quote' ? 'العرض ' : 'الفاتورة ') + id + ' (' + channel + ')', me);
      save();
      return { ok: true, link: s(r!.link) };
    }
  };
}
export function resetBilling() { bdb = null; store.del(KEY); }

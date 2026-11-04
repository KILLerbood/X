import type { Invoice, Quote, Payment } from '../api/schemas';

/** The four numbers at the top of «الفلوس». Pure. */
export function summarize(b: { invoices: Invoice[]; quotes: Quote[]; payments: Payment[] }, now = Date.now()) {
  const open = b.invoices.filter((i) => !['ملغاة', 'مدفوعة'].includes(i.status) && (i.balance ?? i.amount) > 0);
  const late = open.filter((i) => i.overdue || (i.dueDate && Date.parse(i.dueDate) < now));
  const month = new Date(now).toISOString().slice(0, 7);
  return {
    outstanding: open.reduce((a, i) => a + (i.balance ?? i.amount), 0),
    late: late.reduce((a, i) => a + (i.balance ?? i.amount), 0),
    lateCount: late.length,
    collected: b.payments.filter((p) => (p.date || p.created).slice(0, 7) === month).reduce((a, p) => a + p.amount, 0),
    pendingQuotes: b.quotes.filter((q) => ['مرسل', 'اتفتح', 'مسودة'].includes(q.status)).length
  };
}
export const invoiceTone = (i: Invoice) => (i.status === 'مدفوعة' ? 'ok' : i.status === 'ملغاة' ? '' : i.overdue ? 'bad' : 'warn');
export const quoteTone = (q: Quote) => (q.status === 'مقبول' ? 'ok' : q.status === 'مرفوض' ? 'bad' : q.status === 'اتفتح' ? 'accent' : 'warn');

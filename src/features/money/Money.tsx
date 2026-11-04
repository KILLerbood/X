import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { errorText } from '../../api/errors';
import type { Invoice, Quote } from '../../api/schemas';
import { summarize, invoiceTone, quoteTone } from '../../lib/money';
import { compact, fDate, money, relDay, latinDigits } from '../../lib/format';
import { Empty, Modal, RowsSkeleton, Spinner } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toast';

type Tab = 'invoices' | 'quotes' | 'payments';

/** «الفلوس»: who owes what, what's late, what came in. Quote → invoice → payment. */
export default function Money() {
  const q = useQuery({ queryKey: ['billing'], queryFn: () => api.billing({}) });
  const [tab, setTab] = useState<Tab>('invoices');
  const [pay, setPay] = useState<Invoice | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const sum = useMemo(() => (q.data ? summarize(q.data) : null), [q.data]);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['billing'] }); qc.invalidateQueries({ queryKey: ['boot'] }); };

  async function send(kind: 'quote' | 'invoice', id: string) {
    try {
      const r = await api.sendDoc(kind, id, 'link');
      const link = r.link.startsWith('http') ? r.link : location.href.split('#')[0] + r.link;
      try { await navigator.clipboard.writeText(link); toast({ text: 'الرابط اتنسخ، ابعته للعميل' }); } catch { toast({ text: 'اتبعت ✓' }); }
      refresh();
    } catch (e) { toast({ text: errorText(e, 'ar'), bad: true }); }
  }
  async function decide(qt: Quote, decision: 'accept' | 'reject') {
    try { await api.decideQuote(qt.id, decision); toast({ text: decision === 'accept' ? 'مبروك! العرض اتقبل 🎉' : 'اتسجل إن العرض اترفض' }); refresh(); }
    catch (e) { toast({ text: errorText(e, 'ar'), bad: true }); }
  }

  const d = q.data;
  const cur = d?.settings.currency || 'USD';
  return (
    <div className="page">
      <div className="page__head">
        <div><h1>الفلوس</h1><p>العرض ← الفاتورة ← الدفع. كله مربوط بمحادثة العميل.</p></div>
        <div className="seg" role="tablist" aria-label="النوع">
          <button role="tab" aria-selected={tab === 'invoices'} aria-pressed={tab === 'invoices'} onClick={() => setTab('invoices')}>الفواتير</button>
          <button role="tab" aria-selected={tab === 'quotes'} aria-pressed={tab === 'quotes'} onClick={() => setTab('quotes')}>العروض</button>
          <button role="tab" aria-selected={tab === 'payments'} aria-pressed={tab === 'payments'} onClick={() => setTab('payments')}>المدفوعات</button>
        </div>
      </div>
      {q.isLoading ? <RowsSkeleton n={5} /> : q.error || !d || !sum ? (
        <Empty icon="info" title="مش قادرين نجيب الحسابات">{errorText(q.error, 'ar')}</Empty>
      ) : (
        <>
          <div className="grid kpis" style={{ marginBottom: 20 }}>
            <div className="tile"><div className="tile__label">لينا برّه</div><div className="tile__value num">{compact(sum.outstanding)}</div><div className="tile__delta faint">{cur}</div></div>
            <div className="tile"><div className="tile__label">متأخر</div><div className="tile__value num" style={{ color: sum.late ? 'var(--bad)' : undefined }}>{compact(sum.late)}</div><div className="tile__delta faint">{sum.lateCount} فاتورة</div></div>
            <div className="tile"><div className="tile__label">اتحصّل الشهر ده</div><div className="tile__value num" style={{ color: 'var(--ok)' }}>{compact(sum.collected)}</div><div className="tile__delta faint">{cur}</div></div>
            <div className="tile"><div className="tile__label">عروض مستنية رد</div><div className="tile__value num">{sum.pendingQuotes}</div><div className="tile__delta">&nbsp;</div></div>
          </div>
          <div className="ledger" role="tabpanel">
            {tab === 'invoices' && (d.invoices.length ? d.invoices.slice().sort((a, b) => Number(b.overdue) - Number(a.overdue) || Number((b.balance ?? 0) > 0) - Number((a.balance ?? 0) > 0) || (a.dueDate < b.dueDate ? -1 : 1)).map((i) => {
              const paid = i.paid || 0;
              return (
                <div key={i.id} className="doc">
                  <span className="doc__icon"><Icon name="doc" /></span>
                  <span className="doc__body"><b><Link to={'/chats/' + i.leadId} style={{ textDecoration: 'none' }}>{i.leadName}</Link></b><span><span className="num">{i.id}</span>{i.label ? ' · ' + i.label : ''} · الاستحقاق {relDay(i.dueDate)} <span className={'pill pill--' + invoiceTone(i)}>{i.overdue && i.status !== 'مدفوعة' ? 'متأخرة' : i.status}</span></span></span>
                  <span className="doc__amt num">{money(i.amount)} <small>{paid ? 'اتدفع ' + money(paid) : 'لسه'}</small><div className="progress"><i style={{ width: Math.min(100, (paid / Math.max(1, i.amount)) * 100) + '%' }} /></div></span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    {(i.balance ?? 0) > 0 && i.status !== 'ملغاة' && <button className="btn btn--sm btn--primary" onClick={() => setPay(i)}>سجّل دفعة</button>}
                    <button className="btn btn--sm" onClick={() => send('invoice', i.id)}>الرابط</button>
                  </span>
                </div>
              );
            }) : <Empty icon="doc" title="مفيش فواتير لسه">الفاتورة بتتعمل لما العميل يقبل العرض.</Empty>)}
            {tab === 'quotes' && (d.quotes.length ? d.quotes.map((x) => (
              <div key={x.id} className="doc">
                <span className="doc__icon"><Icon name="note" /></span>
                <span className="doc__body"><b><Link to={'/chats/' + x.leadId} style={{ textDecoration: 'none' }}>{x.leadName}</Link></b><span><span className="num">{x.id}</span> · {fDate(x.date)}{x.monthly ? ' · شهري ' + money(x.monthly) : ''} <span className={'pill pill--' + quoteTone(x)}>{x.status}</span></span></span>
                <span className="doc__amt num">{money(x.total)} <small>{x.currency || cur}</small></span>
                <span style={{ display: 'flex', gap: 6 }}>
                  {['مرسل', 'اتفتح', 'مسودة'].includes(x.status) && <><button className="btn btn--sm" onClick={() => decide(x, 'accept')}>اتقبل</button><button className="btn btn--sm btn--ghost" onClick={() => decide(x, 'reject')}>اترفض</button></>}
                  <button className="btn btn--sm" onClick={() => send('quote', x.id)}>الرابط</button>
                </span>
              </div>
            )) : <Empty icon="note" title="مفيش عروض لسه" />)}
            {tab === 'payments' && (d.payments.length ? d.payments.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((p) => (
              <div key={p.id} className="doc">
                <span className="doc__icon" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}><Icon name="money" /></span>
                <span className="doc__body"><b>{p.leadName}</b><span>{fDate(p.date)} · {p.method} · <span className="num">{p.invoiceId}</span></span></span>
                <span className="doc__amt num" style={{ color: 'var(--ok)' }}>+{money(p.amount)} <small>{p.currency || cur}</small></span>
                <span />
              </div>
            )) : <Empty icon="money" title="مفيش مدفوعات لسه" />)}
          </div>
        </>
      )}
      {pay && <PayModal inv={pay} currency={cur} onClose={() => setPay(null)} onDone={() => { setPay(null); refresh(); }} />}
    </div>
  );
}

function PayModal({ inv, currency, onClose, onDone }: { inv: Invoice; currency: string; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(inv.balance ?? inv.amount));
  const [method, setMethod] = useState('تحويل بنكي');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toast = useToast();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await api.recordPayment(inv.id, { amount: Number(latinDigits(amount).replace(/[^\d.]/g, '')), method, date: new Date().toISOString().slice(0, 10) });
      toast({ text: 'الدفعة اتسجلت 💰' });
      onDone();
    } catch (x) { setErr(errorText(x, 'ar')); } finally { setBusy(false); }
  }
  return (
    <Modal title={'دفعة على ' + inv.id} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal__body">
          <p className="muted" style={{ margin: 0 }}>{inv.leadName} · المتبقي <b className="num">{money(inv.balance ?? inv.amount)} {currency}</b></p>
          <label className="field"><span>المبلغ</span><input className="input num" dir="ltr" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></label>
          <div className="opts" role="group" aria-label="طريقة الدفع">{['تحويل بنكي', 'كاش', 'إنستاباي', 'فودافون كاش', 'بطاقة'].map((m) => <button type="button" key={m} className="opt" aria-pressed={method === m} onClick={() => setMethod(m)}>{m}</button>)}</div>
          {err && <p className="err" role="alert">{err}</p>}
        </div>
        <div className="modal__foot"><button type="button" className="btn btn--ghost" onClick={onClose}>إلغاء</button><button className="btn btn--primary" disabled={busy}>{busy ? <Spinner /> : 'سجّل'}</button></div>
      </form>
    </Modal>
  );
}

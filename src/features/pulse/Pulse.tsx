import { useMemo, useState } from 'react';
import { useBootstrap, useDashboard } from '../../api/queries';
import { errorText } from '../../api/errors';
import { delta, lastDays, funnelShares, forecast } from '../../lib/metrics';
import { compact, fDate, fMonthShort, money, pct } from '../../lib/format';
import { todayKey } from '../../lib/time';
import { Empty, Sk } from '../../ui/kit';

/** «النبض»: how the business is doing, in one calm page. Numbers come from crmDashboard. */
export default function Pulse() {
  const [days, setDays] = useState(30);
  const r = useMemo(() => lastDays(days, todayKey()), [days]);
  const q = useDashboard(r.from, r.to);
  const { data: b } = useBootstrap();
  const d = q.data;

  return (
    <div className="page">
      <div className="page__head">
        <div><h1>النبض</h1><p>{d ? 'من ' + fDate(d.range.from) + ' لـ ' + fDate(d.range.to) + '، مقارنة بالفترة اللي قبلها' : 'أرقام الشغل في مكان واحد'}</p></div>
        <div className="seg" role="group" aria-label="الفترة">
          {[7, 30, 90].map((n) => <button key={n} aria-pressed={days === n} onClick={() => setDays(n)}>{n === 7 ? 'أسبوع' : n === 30 ? 'شهر' : '3 شهور'}</button>)}
        </div>
      </div>
      {q.isLoading ? (
        <div className="grid kpis">{Array.from({ length: 6 }, (_, i) => <div key={i} className="tile"><Sk w="50%" /><div style={{ height: 10 }} /><Sk w="70%" h={30} /></div>)}</div>
      ) : q.error || !d ? <Empty icon="info" title="مش قادرين نجيب الأرقام">{errorText(q.error, 'ar')}</Empty> : (
        <>
          <div className="grid kpis">
            <Kpi label="عملاء جداد" value={d.cur.leads} prev={d.prev.leads} />
            <Kpi label="اجتماعات حصلت" value={d.cur.held} prev={d.prev.held} />
            <Kpi label="صفقات اتقفلت" value={d.cur.won} prev={d.prev.won} />
            <Kpi label="الدخل الشهري (MRR)" value={d.revenue.mrr} money />
            <Kpi label="نسبة الفوز" text={pct(d.cur.winRate)} />
            <Kpi label="متوقع يتقفل (مرجّح)" value={forecast(d.pipelineNow)} money hint={'من ' + d.revenue.openDeals + ' صفقة مفتوحة'} />
          </div>
          <div className="grid cards2">
            <section className="card">
              <h3>القمع: مين وصل لفين</h3>
              <div className="funnel">
                {d.cur.funnel.map((s, i) => {
                  const w = funnelShares(d.cur.funnel)[i];
                  return <div key={s.key} className="funnel__row"><span>{s.label}</span><span className="funnel__bar"><i style={{ width: w * 100 + '%', opacity: 1 - i * 0.08 }} /></span><b className="num">{s.count}</b></div>;
                })}
              </div>
            </section>
            <section className="card">
              <h3>الدخل الشهري</h3>
              <Bars months={d.revenue.months} />
            </section>
            <section className="card">
              <h3>العملاء بيجوا منين</h3>
              <table className="table">
                <thead><tr><th>المصدر</th><th>عملاء</th><th>اتقابلنا</th><th>كسبنا</th><th>MRR</th></tr></thead>
                <tbody>{d.sources.slice(0, 7).map((s) => <tr key={s.name}><td>{s.name}</td><td className="num">{s.leads}</td><td className="num">{s.met}</td><td className="num">{s.won}</td><td className="num">{compact(s.mrr)}</td></tr>)}</tbody>
              </table>
            </section>
            <section className="card">
              <h3>الفريق</h3>
              <table className="table">
                <thead><tr><th>الاسم</th><th>شغّال على</th><th>كسب</th><th>متأخر</th></tr></thead>
                <tbody>{d.team.map((t) => <tr key={t.name}><td>{t.name}</td><td className="num">{t.active}</td><td className="num">{t.won}</td><td className={'num' + (t.overdue ? ' why-overdue' : '')}>{t.overdue}</td></tr>)}</tbody>
              </table>
            </section>
            {d.revenue.renewals.length > 0 && (
              <section className="card">
                <h3>تجديدات جاية</h3>
                <table className="table"><tbody>{d.revenue.renewals.slice(0, 6).map((x) => <tr key={x.id}><td>{x.name}</td><td>{fDate(x.renewal)}</td><td className="num">{money(x.mrr)}</td></tr>)}</tbody></table>
              </section>
            )}
            {d.losses.total > 0 && (
              <section className="card">
                <h3>خسرنا ليه؟ <span className="faint num">({d.losses.total})</span></h3>
                <div className="funnel">{d.losses.reasons.slice(0, 6).map((x) => <div key={x.name} className="funnel__row"><span>{x.name}</span><span className="funnel__bar"><i style={{ width: (x.count / Math.max(1, d.losses.reasons[0].count)) * 100 + '%', background: 'var(--t-lost)' }} /></span><b className="num">{x.count}</b></div>)}</div>
              </section>
            )}
          </div>
          {b && !b.me.isAdmin && <p className="hint" style={{ marginTop: 16 }}>الأرقام دي للعملاء المسندين ليك بس.</p>}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, prev, money: isMoney, text, hint }: { label: string; value?: number; prev?: number; money?: boolean; text?: string; hint?: string }) {
  const dl = value !== undefined && prev !== undefined ? delta(value, prev) : null;
  return (
    <div className="tile">
      <div className="tile__label">{label}</div>
      <div className="tile__value num">{text ?? (isMoney ? compact(value || 0) : value)}{isMoney && <small style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-3)' }}> USD</small>}</div>
      {dl ? <div className={'tile__delta ' + (dl.dir === 'up' ? 'up' : dl.dir === 'down' ? 'down' : 'faint')}>{dl.dir === 'up' ? '▲' : dl.dir === 'down' ? '▼' : '•'} <span className="num">{dl.pct}%</span> عن اللي قبلها</div> : hint ? <div className="tile__delta faint">{hint}</div> : <div className="tile__delta">&nbsp;</div>}
    </div>
  );
}

function Bars({ months }: { months: { month: string; mrr: number; joined: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.mrr));
  const W = 520, H = 180, gap = 10, bw = months.length ? (W - gap * (months.length - 1)) / months.length : 0;
  if (!months.length) return <p className="faint">لسه مفيش دخل شهري.</p>;
  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} width="100%" role="img" aria-label="الدخل الشهري لكل شهر" style={{ direction: 'ltr' }}>
      {months.map((m, i) => {
        const h = Math.max(2, (m.mrr / max) * H);
        const x = i * (bw + gap);
        const last = i === months.length - 1;
        return (
          <g key={m.month}>
            <title>{fMonthShort(m.month) + ': ' + money(m.mrr) + ' USD'}</title>
            <rect x={x} y={H - h} width={bw} height={h} rx={6} fill={last ? 'var(--accent)' : 'var(--line-2)'} />
            <text x={x + bw / 2} y={H + 18} textAnchor="middle" fontSize="12" fill="var(--ink-3)">{months.length <= 8 || i % 2 === (months.length - 1) % 2 ? fMonthShort(m.month) : ''}</text>
            {last && <text x={x + bw / 2} y={H - h - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">{compact(m.mrr)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

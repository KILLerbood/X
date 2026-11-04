import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBootstrap } from '../../api/queries';
import { errorText } from '../../api/errors';
import { conversations, filterConvs, counts, FILTERS, type FilterId, type Conv } from '../../lib/inbox';
import { search } from '../../lib/arabic';
import { ago } from '../../lib/format';
import { Avatar, Empty, RowsSkeleton } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { useUi, typing } from '../../app/ui';
import { Conversation } from './Conversation';
import { useNow } from '../../lib/hooks';

const isFilter = (v: string | null): v is FilterId => FILTERS.some((f) => f.id === v);

export function Chats() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const f: FilterId = isFilter(sp.get('f')) ? (sp.get('f') as FilterId) : 'waiting';
  const [q, setQ] = useState('');
  const boot = useBootstrap();
  const b = boot.data;
  const nav = useNavigate();
  const ui = useUi();
  const searchRef = useRef<HTMLInputElement>(null);
  const now = useNow();

  const all = useMemo(() => (b ? conversations(b.leads, b.tasks, b.bookings, b.settings.staleDays || 7) : []), [b]);
  const n = useMemo(() => counts(all), [all]);
  const shown = useMemo(() => {
    const list = filterConvs(all, q ? 'all' : f);
    if (!q) return list;
    const byId = new Map(list.map((c) => [c.lead.id, c]));
    return search(list.map((c) => c.lead), q).map((l) => byId.get(l.id)!);
  }, [all, f, q]);

  // J / K: next / previous conversation (by physical key, so it works on an Arabic layout too). «/» jumps to search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Slash' && !e.shiftKey) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.code !== 'KeyJ' && e.code !== 'KeyK') return;
      if (!shown.length) return;
      e.preventDefault();
      const i = shown.findIndex((c) => c.lead.id === id);
      const j = e.code === 'KeyJ' ? Math.min(shown.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
      nav('/chats/' + shown[j].lead.id + (sp.toString() ? '?' + sp.toString() : ''));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, id, nav, sp]);

  const qs = sp.toString() ? '?' + sp.toString() : '';
  const current = id ? all.find((c) => c.lead.id === id) : undefined;
  const nextAfter = (leadId: string) => { const i = shown.findIndex((c) => c.lead.id === leadId); return shown[i + 1]?.lead.id || null; };

  return (
    <div className={'chats' + (id ? ' chats--open' : '')}>
      <section className="list" aria-label="المحادثات" data-tour="list">
        <div className="list__head">
          <div className="list__title">
            <h1>المحادثات</h1>
            <button className="btn btn--ghost btn--sm" onClick={ui.openPalette} title="بحث وأوامر (Ctrl+K)"><Icon name="bolt" size={16} />أوامر <span className="kbd">Ctrl K</span></button>
          </div>
          <div className="search">
            <Icon name="search" />
            <label className="sr" htmlFor="q">دوّر على عميل</label>
            <input id="q" ref={searchRef} className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر بالاسم، الموبايل، المدينة…" onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); e.currentTarget.blur(); } if (e.key === 'Enter' && shown[0]) nav('/chats/' + shown[0].lead.id + qs); }} />
            {!q && <span className="kbd" aria-hidden="true">/</span>}
          </div>
        </div>
        {!q && (
          <div className="chips" role="toolbar" aria-label="فلاتر" data-tour="filters">
            {FILTERS.map((x) => (
              <button key={x.id} className="chip" aria-pressed={f === x.id} onClick={() => setSp(x.id === 'waiting' ? {} : { f: x.id }, { replace: true })}>
                {x.label} <small className="num">{n[x.id]}</small>
              </button>
            ))}
          </div>
        )}
        <div className="rows">
          {boot.isLoading ? <RowsSkeleton /> : boot.error && !b ? (
            <Empty icon="info" title="مش قادرين نجيب البيانات">{errorText(boot.error, 'ar')}<button className="btn btn--sm" onClick={() => boot.refetch()}>جرّب تاني</button></Empty>
          ) : !shown.length ? (
            q ? <Empty icon="search" title="مفيش نتيجة">جرّب جزء من الاسم أو آخر 4 أرقام من الموبايل.</Empty>
              : f === 'waiting' ? <Empty icon="check" title="مفيش حد مستنيك 🎉">كل المتابعات متظبطة. شوف «الكل» أو ابدأ محادثة جديدة.</Empty>
              : <Empty title="مفيش محادثات هنا" />
          ) : shown.map((c) => <Row key={c.lead.id} c={c} active={c.lead.id === id} qs={qs} now={now} />)}
        </div>
        <button className="fab" onClick={ui.openNewLead} data-tour="new"><Icon name="plus" size={20} />محادثة جديدة</button>
      </section>
      <section className="conv-wrap" style={{ minWidth: 0, minHeight: 0 }}>
        {id && b ? (
          current ? <Conversation key={id} conv={current} boot={b} onNext={() => { const nx = nextAfter(id); if (nx) nav('/chats/' + nx + qs); }} backTo={'/chats' + qs} />
            : <div className="home"><Empty icon="info" title="المحادثة دي مش موجودة">ممكن تكون اتمسحت أو مش مسندة ليك.<Link className="btn btn--sm" to="/chats">ارجع للمحادثات</Link></Empty></div>
        ) : <Home all={all} counts={n} name={b?.me.name || ''} onPick={(x) => setSp(x === 'waiting' ? {} : { f: x })} first={filterConvs(all, 'waiting')[0]} />}
      </section>
    </div>
  );
}

function Row({ c, active, qs, now }: { c: Conv; active: boolean; qs: string; now: number }) {
  const l = c.lead;
  const title = l.business || l.name || l.id;
  return (
    <Link className="row" to={'/chats/' + l.id + qs} aria-current={active}>
      <Avatar name={title} stage={l.stage} />
      <span className="row__body">
        <span className="row__top"><span className="row__name">{title}</span><span className="row__time">{ago(c.last, now)}</span></span>
        <span className="row__sub">
          <span>{l.name && l.business ? l.name + ' · ' : ''}{l.stage || 'جديد'}{l.city ? ' · ' + l.city : ''}</span>
          {c.waiting && <span className={'row__why why-' + c.waiting}>{c.reason}</span>}
        </span>
      </span>
    </Link>
  );
}

/** «عبد الله» stays whole; otherwise the first word. */
const firstName = (n: string) => { const w = n.trim().split(/\s+/); return !w[0] ? 'فندم' : w[0] === 'عبد' && w[1] ? w[0] + ' ' + w[1] : w[0]; };

function Home({ all, counts: n, name, onPick, first }: { all: Conv[]; counts: Record<FilterId, number>; name: string; onPick: (f: FilterId) => void; first?: Conv }) {
  const nav = useNavigate();
  const h = new Date().getHours();
  const hello = h < 12 ? 'صباح الخير' : h < 18 ? 'مساء النور' : 'مساء الخير';
  const today = all.filter((c) => c.waiting === 'today').length;
  const late = all.filter((c) => c.waiting === 'overdue').length;
  return (
    <div className="home">
      <h2>{hello} يا {firstName(name)} 👋<br />{n.waiting ? <><em className="num">{n.waiting}</em> محادثة مستنية ردّك</> : 'مفيش حد مستنيك دلوقتي'}</h2>
      <p>اختار محادثة من القايمة، أو ابدأ بأقدم واحد مستنيك. كل حاجة بتعملها (مكالمة، واتساب، ملاحظة) بتتسجل في خيط العميل.</p>
      <div className="home__stats">
        <button onClick={() => onPick('today')}><b className="num" style={{ color: 'var(--bad)' }}>{late}</b><span>متأخرين</span></button>
        <button onClick={() => onPick('today')}><b className="num" style={{ color: 'var(--accent)' }}>{today}</b><span>النهارده</span></button>
        <button onClick={() => onPick('new')}><b className="num">{n.new}</b><span>جداد</span></button>
      </div>
      {first && <button className="btn btn--ink" onClick={() => nav('/chats/' + first.lead.id)}>ابدأ بـ «{first.lead.business || first.lead.name}» <Icon name="arrow" size={18} /></button>}
    </div>
  );
}

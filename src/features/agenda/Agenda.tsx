import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBootstrap, upsertTask, qk } from '../../api/queries';
import { api } from '../../api/endpoints';
import { errorText } from '../../api/errors';
import { buildAgenda, type Slot } from '../../lib/agenda';
import { fDayLong, fTime, relDay } from '../../lib/format';
import { todayKey } from '../../lib/time';
import { Empty, RowsSkeleton } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toast';

/** «يومي»: what's on today and the coming week, one list, tick tasks off in place. */
export default function Agenda() {
  const { data: b, isLoading } = useBootstrap();
  const [mine, setMine] = useState(true);
  const [days, setDays] = useState(7);
  const qc = useQueryClient();
  const toast = useToast();
  const agenda = useMemo(() => (b ? buildAgenda(b.tasks, b.bookings, { me: b.me.name, mineOnly: mine, days }) : []), [b, mine, days]);
  const today = agenda.find((d) => d.day === todayKey());
  const todayCount = today?.slots.filter((s) => s.kind === 'meeting' || s.task.status === 'مفتوحة').length || 0;

  async function toggle(id: string, done: boolean) {
    try {
      const r = await api.setTask(id, done ? 'تمت' : 'مفتوحة');
      upsertTask(qc, r.task);
      qc.invalidateQueries({ queryKey: qk.boot });
      if (done) toast({ text: 'برافو، اتقفلت ✓', action: { label: 'تراجع', run: () => toggle(id, false) } });
    } catch (e) { toast({ text: errorText(e, 'ar'), bad: true }); }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div><h1>يومي</h1><p>{b ? (todayCount ? 'النهارده عندك ' + todayCount + ' حاجة. يلا بينا.' : 'النهارده فاضي. فرصة تكلّم حد ساكت من زمان.') : ' '}</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="seg" role="group" aria-label="بتاع مين">
            <button aria-pressed={mine} onClick={() => setMine(true)}>بتاعي</button>
            <button aria-pressed={!mine} onClick={() => setMine(false)}>الفريق كله</button>
          </div>
          <div className="seg" role="group" aria-label="المدة">
            <button aria-pressed={days === 1} onClick={() => setDays(1)}>النهارده</button>
            <button aria-pressed={days === 7} onClick={() => setDays(7)}>أسبوع</button>
            <button aria-pressed={days === 30} onClick={() => setDays(30)}>شهر</button>
          </div>
        </div>
      </div>
      {isLoading ? <RowsSkeleton n={6} /> : !agenda.length ? (
        <Empty icon="agenda" title="مفيش مواعيد ولا مهام">لما تضيف مهمة من أي محادثة، أو حد يحجز اجتماع، هيظهر هنا.</Empty>
      ) : (
        <div className="agenda">
          {agenda.map((d) => (
            <section key={d.day} className="agenda__day">
              <h3>{relDay(d.day + 'T12:00:00Z')}<small>{fDayLong(d.day + 'T12:00:00Z')}</small></h3>
              {d.slots.map((s) => <SlotRow key={(s.kind === 'task' ? s.task.id : s.booking.id)} s={s} onToggle={toggle} />)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function SlotRow({ s, onToggle }: { s: Slot; onToggle: (id: string, done: boolean) => void }) {
  if (s.kind === 'meeting') {
    const b = s.booking;
    return (
      <div className="slot slot--meet">
        <span className="slot__time num">{fTime(s.at)}</span>
        <span className="slot__body"><b>اجتماع مع {b.business || b.name}</b><span>{[b.meetingType, b.platform, b.status].filter(Boolean).join(' · ')}</span></span>
        <span style={{ display: 'flex', gap: 6 }}>
          {b.meetLink && <a className="btn btn--sm" href={b.meetLink} target="_blank" rel="noreferrer">ادخل</a>}
          {b.leadId && <Link className="btn btn--sm btn--ghost" to={'/chats/' + b.leadId}><Icon name="chat" size={16} />المحادثة</Link>}
        </span>
      </div>
    );
  }
  const t = s.task;
  const done = t.status === 'تمت';
  return (
    <div className={'slot' + (s.late ? ' slot--late' : '') + (done ? ' slot--done' : '')}>
      <span className="slot__time">
        <button className="check" onClick={() => onToggle(t.id, !done)} aria-label={(done ? 'رجّع: ' : 'خلّصت: ') + t.task} aria-pressed={done} style={done ? { background: 'var(--ok)', borderColor: 'var(--ok)' } : undefined}>
          <Icon name="check" className={done ? 'on' : ''} />
        </button>
      </span>
      <span className="slot__body"><b>{t.task}</b><span>{s.late ? <span className="why-overdue">متأخرة ({relDay(t.due)}) · </span> : null}{t.leadName || 'مهمة عامة'}{t.owner ? ' · ' + t.owner : ''}</span></span>
      {t.leadId ? <Link className="btn btn--sm btn--ghost" to={'/chats/' + t.leadId}><Icon name="chat" size={16} />المحادثة</Link> : <span />}
    </div>
  );
}

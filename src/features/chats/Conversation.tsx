import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLead } from '../../api/queries';
import type { Bootstrap, Booking } from '../../api/schemas';
import type { Conv } from '../../lib/inbox';
import { buildTimeline, type Bubble } from '../../lib/timeline';
import { ROAD, SHORT, stepOf, stageTone, OFF_ROAD } from '../../lib/journey';
import { fDayLong, fTime, relDay } from '../../lib/format';
import { todayKey, dayKey, toDate } from '../../lib/time';
import { Avatar, Modal, Sk } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toast';
import { useLeadActions } from './actions';
import { Composer } from './Composer';
import { Panel } from './Panel';

const KIND_ICON: Record<string, string> = { 'واتساب': 'wa', 'إيميل': 'mail', 'مكالمة': 'phone', 'اجتماع': 'meet', 'ملاحظة': 'note', 'تغيير مرحلة': 'flag', 'نظام': 'bolt' };

export function Conversation({ conv, boot, onNext, backTo }: { conv: Conv; boot: Bootstrap; onNext: () => void; backTo: string }) {
  const lead = conv.lead;
  const detail = useLead(lead.id);
  const act = useLeadActions(lead.id);
  const toast = useToast();
  const [panel, setPanel] = useState(false);
  const [lose, setLose] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const title = lead.business || lead.name || lead.id;

  const days = useMemo(() => (detail.data ? buildTimeline(detail.data.activities, detail.data.tasks, detail.data.bookings) : []), [detail.data]);
  const count = days.reduce((a, d) => a + d.items.length, 0);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [count]);

  async function moveTo(stage: string) {
    if (stage === lead.stage) return;
    if (stage === 'خسرناه') { setLose(true); return; }
    const prev = lead.stage;
    const r = await act.save({ stage });
    if (r) toast({ text: 'اتنقل لـ «' + stage + '»', action: { label: 'تراجع', run: () => { act.save({ stage: prev }, 'رجع لـ «' + prev + '»'); } } });
  }

  return (
    <div className={'conv'}>
      <div className="thread">
        <header className="thread__head">
          <Link className="btn btn--ghost btn--icon back" to={backTo} aria-label="رجوع"><Icon name="back" /></Link>
          <Avatar name={title} stage={lead.stage} size={42} />
          <div className="thread__who">
            <h2>{title}</h2>
            <p>{[lead.name !== title ? lead.name : '', lead.city, lead.owner ? 'مع ' + lead.owner : 'من غير مسؤول'].filter(Boolean).join(' · ')}</p>
          </div>
          {lead.phone && <a className="btn btn--ghost btn--icon" href={'tel:' + lead.phone} aria-label="اتصل" title="اتصل"><Icon name="phone" size={20} /></a>}
          <button className="btn btn--ghost btn--icon panel-toggle" onClick={() => setPanel((x) => !x)} aria-label="ملف العميل" aria-expanded={panel}><Icon name="panel" size={20} /></button>
          <button className="btn btn--sm next-btn" onClick={onNext} title="المحادثة اللي بعدها (J)" aria-label="المحادثة اللي بعدها"><span>اللي بعده</span> <Icon name="arrow" size={16} /></button>
        </header>
        <Road stage={lead.stage} onPick={moveTo} />
        <div className="bubbles" ref={scroller} aria-live="polite" aria-label={'محادثة ' + title}>
          {detail.isLoading ? (
            <div style={{ display: 'grid', gap: 12 }}><Sk w="40%" h={42} r={18} /><div style={{ justifySelf: 'end', width: '50%' }}><Sk h={56} r={18} /></div><Sk w="55%" h={42} r={18} /></div>
          ) : detail.error ? <p className="err">مش قادرين نفتح المحادثة. <button className="btn btn--sm" onClick={() => detail.refetch()}>جرّب تاني</button></p>
          : !count ? <div className="ev">لسه مفيش أي حاجة هنا. ابدأ بأول رسالة تحت 👇</div>
          : days.map((d) => (
            <div key={d.day} style={{ display: 'contents' }}>
              <div className="daysep">{d.day === todayKey() ? 'النهارده' : relDay(d.day) === 'امبارح' ? 'امبارح' : fDayLong(d.day + 'T12:00:00Z')}</div>
              {d.items.map((it) => <BubbleView key={it.type + it.id} it={it} onDone={act.doneTask} onMeeting={act.meeting} />)}
            </div>
          ))}
        </div>
        <Composer lead={lead} boot={boot} act={act} booking={conv.nextMeeting || latestBooking(detail.data?.bookings)} onStage={() => { const i = stepOf(lead.stage); if (i >= 0 && i < ROAD.length - 1) moveTo(ROAD[i + 1]); }} />
      </div>
      <Panel lead={lead} boot={boot} detail={detail.data} act={act} open={panel} onClose={() => setPanel(false)} onStage={moveTo} />
      {lose && <LoseModal reasons={boot.lists['سبب الخسارة'] || []} onClose={() => setLose(false)} onPick={async (reason) => { setLose(false); await act.save({ stage: 'خسرناه', lostReason: reason }, 'اتقفل كـ «خسرناه»'); }} />}
    </div>
  );
}

const latestBooking = (list?: Booking[]) => (list || []).slice().sort((a, b) => ((a.startIso || a.start) < (b.startIso || b.start) ? 1 : -1))[0] || null;

function Road({ stage, onPick }: { stage: string; onPick: (s: string) => void }) {
  const here = stepOf(stage || 'جديد');
  const tone = stageTone(stage);
  return (
    <nav className={'road tone-' + tone} aria-label="رحلة العميل" data-tour="road">
      {ROAD.map((s, i) => (
        <button key={s} className={'road__step' + (here >= 0 && i < here ? ' done' : '') + (i === here ? ' here' : '')} onClick={() => onPick(s)} aria-current={i === here ? 'step' : undefined} title={'انقل لـ «' + s + '»'}>
          <i>{here >= 0 && i < here && <Icon name="check" />}</i>{SHORT[s]}
        </button>
      ))}
      <div className="road__off">
        {OFF_ROAD.map((s) => <button key={s} className={'chip' + (stage === s ? '' : '')} aria-pressed={stage === s} onClick={() => onPick(s)} style={{ height: 28 }}>{s}</button>)}
      </div>
    </nav>
  );
}

function BubbleView({ it, onDone, onMeeting }: { it: Bubble; onDone: (id: string) => void; onMeeting: (id: string, s: string) => void }) {
  if (it.type === 'activity') {
    if (it.side === 'center') return <div className="ev"><Icon name={KIND_ICON[it.kind] || 'bolt'} />{it.text}<span className="faint">· {fTime(it.at)}</span></div>;
    return (
      <div className={'b b--' + it.side}>
        <div className="b__kind"><Icon name={KIND_ICON[it.kind] || 'note'} />{it.kind}{it.side === 'them' ? ' · منه' : ''}</div>
        <div className="b__text">{it.text}</div>
        {it.details && it.details !== it.text && <div className="b__details">{it.details}</div>}
        <div className="b__meta">{it.by ? it.by + ' · ' : ''}<span className="num">{fTime(it.at)}</span></div>
      </div>
    );
  }
  if (it.type === 'meeting') {
    const b = it.booking;
    const past = (toDate(b.startIso || b.start)?.getTime() || 0) < Date.now();
    return (
      <div className="card-in">
        <span className="card-in__icon"><Icon name="meet" /></span>
        <span className="card-in__body"><b>اجتماع{b.meetingType ? ': ' + b.meetingType : ''}</b>{fDayLong(b.startIso || b.start)} · <span className="num">{fTime(b.startIso || b.start)}</span> · {b.status || 'مؤكد'}</span>
        {past && b.status === 'مؤكد' ? (
          <span style={{ display: 'flex', gap: 6 }}><button className="btn btn--sm" onClick={() => onMeeting(b.id, 'تم')}>تم</button><button className="btn btn--sm btn--ghost" onClick={() => onMeeting(b.id, 'لم يحضر')}>محضرش</button></span>
        ) : b.meetLink ? <a className="btn btn--sm" href={b.meetLink} target="_blank" rel="noreferrer">الرابط</a> : null}
      </div>
    );
  }
  const t = it.task;
  const late = dayKey(t.due) < todayKey();
  return (
    <div className={'card-in' + (late ? ' card-in--late' : '')}>
      <span className="card-in__icon"><Icon name="task" /></span>
      <span className="card-in__body"><b>{t.task}</b>{late ? 'متأخرة · ' : ''}{relDay(t.due)}{t.owner ? ' · ' + t.owner : ''}</span>
      <button className="check" onClick={() => onDone(t.id)} aria-label={'خلّصت: ' + t.task} title="خلّصت"><Icon name="check" /></button>
    </div>
  );
}

function LoseModal({ reasons, onClose, onPick }: { reasons: string[]; onClose: () => void; onPick: (r: string) => void }) {
  return (
    <Modal title="ليه خسرناه؟" onClose={onClose}>
      <div className="modal__body">
        <p className="muted" style={{ margin: 0 }}>السبب بيساعدنا نعرف نتحسن فين. المحادثة بتفضل محفوظة وتقدر ترجّعها في أي وقت.</p>
        <div className="opts">{reasons.map((r) => <button key={r} className="opt" onClick={() => onPick(r)}>{r}</button>)}</div>
      </div>
    </Modal>
  );
}

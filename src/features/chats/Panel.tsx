import { useEffect, useState } from 'react';
import type { Bootstrap, Lead, LeadDetail } from '../../api/schemas';
import { STAGES } from '../../api/schemas';
import { dayKey, todayKey, toDate } from '../../lib/time';
import { fDayLong, fTime, money, relDay } from '../../lib/format';
import { waLink } from '../../lib/templates';
import { Avatar, Stage } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import type { useLeadActions } from './actions';

/** The client's file next to the conversation: editable in place, saved on change. */
export function Panel({ lead, boot, detail, act, open, onClose, onStage }: { lead: Lead; boot: Bootstrap; detail?: LeadDetail; act: ReturnType<typeof useLeadActions>; open: boolean; onClose: () => void; onStage: (s: string) => void }) {
  const title = lead.business || lead.name || lead.id;
  const lists = boot.lists;
  const tasks = (detail?.tasks || []).filter((t) => t.status === 'مفتوحة').sort((a, b) => (a.due < b.due ? -1 : 1));
  const meetings = (detail?.bookings || []).filter((b) => (toDate(b.startIso || b.start)?.getTime() || 0) > Date.now() - 864e5 && b.status !== 'ملغي');
  const wa = waLink(lead.phone, '');

  return (
    <aside className={'panel' + (open ? ' open' : '')} aria-label="ملف العميل" data-tour="panel">
      <div className="panel-toggle panel__close"><button className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label="اقفل ملف العميل"><Icon name="x" size={18} /></button></div>
      <div className="panel__hero">
        <Avatar name={title} stage={lead.stage} size={72} />
        <h3>{title}</h3>
        <Stage stage={lead.stage} />
        <div className="panel__actions">
          {lead.phone && <a className="btn btn--sm" href={'tel:' + lead.phone}><Icon name="phone" size={16} />اتصل</a>}
          {wa && <a className="btn btn--sm" href={wa} target="_blank" rel="noreferrer"><Icon name="wa" size={16} />واتساب</a>}
          {lead.email && <a className="btn btn--sm" href={'mailto:' + lead.email}><Icon name="mail" size={16} />إيميل</a>}
        </div>
      </div>

      <div className="sect">
        <h4>الصفقة</h4>
        <div className="kv">
          <div><span>المرحلة</span><select aria-label="المرحلة" value={lead.stage || 'جديد'} onChange={(e) => onStage(e.target.value)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><span>المسؤول</span><select aria-label="المسؤول" value={lead.owner} onChange={(e) => act.save({ owner: e.target.value }, 'المسؤول اتغيّر')}><option value="">—</option>{boot.team.filter((t) => t.active).map((t) => <option key={t.email} value={t.name}>{t.name}</option>)}</select></div>
          <div><span>الأولوية</span><select aria-label="الأولوية" value={lead.priority} onChange={(e) => act.save({ priority: e.target.value })}>{(lists['الأولوية'] || []).map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><span>قيمة الصفقة</span><NumField value={lead.dealValue} label="قيمة الصفقة" onSave={(v) => act.save({ dealValue: v })} /></div>
          <div><span>شهريًا</span><NumField value={lead.mrr} label="الاشتراك الشهري" onSave={(v) => act.save({ mrr: v })} /></div>
          <div><span>المتابعة الجاية</span><input type="date" aria-label="المتابعة الجاية" value={dayKey(lead.nextFollowUp)} min={todayKey()} onChange={(e) => act.save({ nextFollowUp: e.target.value }, e.target.value ? 'المتابعة: ' + relDay(e.target.value + 'T12:00:00Z') : 'اتشالت المتابعة')} /></div>
        </div>
      </div>

      <div className="sect">
        <h4>المهام المفتوحة {tasks.length ? <span className="num">({tasks.length})</span> : null}</h4>
        <div className="mini">
          {tasks.length ? tasks.map((t) => (
            <div key={t.id}><button className="check" onClick={() => act.doneTask(t.id)} aria-label={'خلّصت: ' + t.task}><Icon name="check" /></button><span>{t.task}</span><small className={dayKey(t.due) < todayKey() ? 'why-overdue' : 'faint'}>{relDay(t.due)}</small></div>
          )) : <p className="faint" style={{ margin: 0, fontSize: 14 }}>مفيش مهام. اكتب واحدة من خانة «مهمة» تحت.</p>}
        </div>
      </div>

      {meetings.length > 0 && (
        <div className="sect">
          <h4>الاجتماعات</h4>
          <div className="mini">{meetings.map((m) => <div key={m.id}><Icon name="meet" size={18} /><span>{fDayLong(m.startIso || m.start)} · <span className="num">{fTime(m.startIso || m.start)}</span></span><small className="faint">{m.status}</small></div>)}</div>
        </div>
      )}

      <div className="sect">
        <h4>البيانات</h4>
        <div className="kv">
          <div><span>الشخص</span><TextField value={lead.name} label="اسم الشخص" onSave={(v) => act.save({ name: v })} /></div>
          <div><span>الموبايل</span><TextField value={lead.phone} label="الموبايل" ltr onSave={(v) => act.save({ phone: v })} /></div>
          <div><span>الإيميل</span><TextField value={lead.email} label="الإيميل" ltr onSave={(v) => act.save({ email: v })} /></div>
          <div><span>المدينة</span><TextField value={lead.city} label="المدينة" onSave={(v) => act.save({ city: v })} /></div>
          <div><span>المصدر</span><select aria-label="المصدر" value={lead.source} onChange={(e) => act.save({ source: e.target.value })}><option value="">—</option>{(lists['المصدر'] || []).map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><span>الخدمة</span><select aria-label="الخدمة" value={lead.service} onChange={(e) => act.save({ service: e.target.value })}><option value="">—</option>{(lists['الخدمة'] || []).map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><span>رقم العميل</span><span className="num faint">{lead.id}</span></div>
          {lead.dealValue ? <div><span>القيمة</span><span className="num">{money(lead.dealValue)} USD</span></div> : null}
        </div>
      </div>
    </aside>
  );
}

function TextField({ value, label, ltr, onSave }: { value: string; label: string; ltr?: boolean; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input aria-label={label} dir={ltr ? 'ltr' : undefined} value={v} placeholder="—" onChange={(e) => setV(e.target.value)} onBlur={() => { if (v.trim() !== value) onSave(v.trim()); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setV(value); }} />;
}
function NumField({ value, label, onSave }: { value: number | null; label: string; onSave: (v: string) => void }) {
  return <TextField value={value == null ? '' : String(value)} label={label} ltr onSave={onSave} />;
}

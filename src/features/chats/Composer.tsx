import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Bootstrap, Lead, Booking } from '../../api/schemas';
import { suggestions } from '../../lib/journey';
import { fill, forChannel, waLink } from '../../lib/templates';
import { addDays, todayKey } from '../../lib/time';
import { Icon } from '../../ui/Icon';
import { Spinner } from '../../ui/kit';
import type { useLeadActions } from './actions';

type Mode = 'note' | 'call' | 'whatsapp' | 'email' | 'task' | 'in';
const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: 'note', label: 'ملاحظة', icon: 'note' },
  { id: 'call', label: 'مكالمة', icon: 'phone' },
  { id: 'whatsapp', label: 'واتساب', icon: 'wa' },
  { id: 'email', label: 'إيميل', icon: 'mail' },
  { id: 'task', label: 'مهمة', icon: 'task' },
  { id: 'in', label: 'ردّه', icon: 'inbox' }
];
const OUTCOMES = ['ردّ واتفقنا', 'مردّش', 'طلب يتصل بعدين', 'مش مهتم دلوقتي'];
const NEXT: [string, number | null][] = [['من غير', null], ['بكرة', 1], ['بعد 3 أيام', 3], ['الأسبوع الجاي', 7]];
const PLACEHOLDER: Record<Mode, string> = {
  note: 'اكتب ملاحظة (بتفضل جوه الفريق)…', call: 'حصل إيه في المكالمة؟ (اختياري)', whatsapp: 'الرسالة…', email: 'نص الإيميل…', task: 'إيه المطلوب؟ مثلاً: ابعتله عرض السعر', in: 'هو قال إيه؟'
};

/**
 * One box for everything you do with a client. Pick what it is (note, call, WhatsApp, email, task, or their reply),
 * write, press Enter. Optionally set when to follow up next. Each mode maps to one existing API call.
 */
export function Composer({ lead, boot, act, booking, onStage }: { lead: Lead; boot: Bootstrap; act: ReturnType<typeof useLeadActions>; booking: Booking | null; onStage: () => void }) {
  const [mode, setMode] = useState<Mode>('note');
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [next, setNext] = useState<number | null>(null);
  const [tpl, setTpl] = useState('');
  const [inKind, setInKind] = useState('واتساب');
  const box = useRef<HTMLTextAreaElement>(null);
  const ctx = useMemo(() => ({ me: boot.me.name, booking, siteUrl: boot.settings.siteUrl }), [boot, booking]);
  const channel = mode === 'email' ? 'إيميل' : 'واتساب';
  const tpls = useMemo(() => (mode === 'whatsapp' || mode === 'email' ? forChannel(boot.templates, channel, lead.stage) : []), [boot.templates, mode, channel, lead.stage]);

  useEffect(() => { const el = box.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(180, el.scrollHeight) + 'px'; } }, [text]);

  function pick(m: Mode, template?: string) {
    setMode(m); setTpl('');
    if (template) {
      const t = forChannel(boot.templates, m === 'email' ? 'إيميل' : 'واتساب', lead.stage).find((x) => x.name === template);
      if (t) applyTemplate(t.id, m);
    } else if (m !== mode) { setText(''); setSubject(''); }
    if (m === 'task') setNext(1);
    setTimeout(() => box.current?.focus(), 0);
  }
  function applyTemplate(id: string, m: Mode = mode) {
    const t = boot.templates.find((x) => x.id === id);
    if (!t) return;
    setTpl(t.name);
    setText(fill(t.body, lead, ctx));
    if (m === 'email') setSubject(fill(t.subject, lead, ctx));
  }

  const ready = mode === 'call' ? true : mode === 'email' ? !!(subject.trim() && text.trim()) : !!text.trim();
  async function send() {
    if (!ready || act.busy) return;
    const body = text.trim();
    let ok: unknown = null;
    if (mode === 'note') ok = await act.note(body.split('\n')[0].slice(0, 300), body);
    else if (mode === 'call') ok = await act.call('مكالمة: ' + outcome, body);
    else if (mode === 'in') ok = await act.incoming(inKind, body.slice(0, 300));
    else if (mode === 'whatsapp') {
      const link = waLink(lead.phone, body);
      if (link) window.open(link, '_blank', 'noopener');
      ok = await act.whatsapp(body, tpl);
    } else if (mode === 'email') {
      if (!lead.email) { await act.note('ملاحظة: العميل ماعندوش إيميل'); return; }
      ok = await act.email(subject.trim(), body);
    } else if (mode === 'task') ok = await act.task(body, addDays(todayKey(), next ?? 1), boot.me.name);
    if (ok && next && mode !== 'task') await act.save({ nextFollowUp: addDays(todayKey(), next) }, 'المتابعة الجاية: ' + NEXT.find((x) => x[1] === next)?.[0]);
    if (ok) { setText(''); setSubject(''); setTpl(''); setNext(null); }
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  }

  const sugg = suggestions(lead.stage);
  return (
    <div className="composer" data-tour="composer">
      <div className="suggest" aria-label="اقتراحات">
        {sugg.map((s) => (
          <button key={s.label} onClick={() => (s.mode === 'stage' ? onStage() : pick(s.mode, s.template))}><Icon name="sparkle" />{s.label}</button>
        ))}
      </div>
      <div className="modes" role="toolbar" aria-label="نوع الرسالة">
        {MODES.map((m) => <button key={m.id} aria-pressed={mode === m.id} onClick={() => pick(m.id)}><Icon name={m.icon} />{m.label}</button>)}
      </div>
      {mode === 'call' && <div className="opts" role="group" aria-label="نتيجة المكالمة">{OUTCOMES.map((o) => <button key={o} className="opt" aria-pressed={outcome === o} onClick={() => { setOutcome(o); if (o === 'مردّش' || o === 'طلب يتصل بعدين') setNext(1); }}>{o}</button>)}</div>}
      {mode === 'in' && <div className="opts" role="group" aria-label="ردّ على إيه؟">{['واتساب', 'مكالمة', 'إيميل'].map((o) => <button key={o} className="opt" aria-pressed={inKind === o} onClick={() => setInKind(o)}>{o}</button>)}</div>}
      {tpls.length > 0 && (
        <div className="opts" role="group" aria-label="قوالب">
          <span className="faint" style={{ fontSize: 13 }}>قوالب:</span>
          {tpls.slice(0, 5).map((t) => <button key={t.id} className="opt" aria-pressed={tpl === t.name} onClick={() => applyTemplate(t.id)}>{t.name}</button>)}
        </div>
      )}
      {mode === 'whatsapp' && !waLink(lead.phone, 'x') && <p className="hint" style={{ margin: 0 }}>مفيش رقم موبايل؛ الرسالة هتتسجل بس من غير ما تفتح واتساب.</p>}
      {mode === 'email' && (
        <>
          {!lead.email && <p className="hint" style={{ margin: 0 }}>العميل ماعندوش إيميل. ضيفه من ملف العميل الأول.</p>}
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="عنوان الإيميل" aria-label="عنوان الإيميل" style={{ borderRadius: 999 }} />
        </>
      )}
      <div className="compose-row">
        <label className="sr" htmlFor="composer">{PLACEHOLDER[mode]}</label>
        <textarea id="composer" ref={box} className="textarea" rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder={PLACEHOLDER[mode]} />
        <button className="send" onClick={send} disabled={!ready || act.busy} aria-label="ابعت">{act.busy ? <Spinner /> : <Icon name="send" />}</button>
      </div>
      <div className="opts" role="group" aria-label={mode === 'task' ? 'ميعاد المهمة' : 'المتابعة الجاية'}>
        <span className="faint" style={{ fontSize: 13 }}><Icon name="clock" size={14} /> {mode === 'task' ? 'الميعاد:' : 'أتابع معاه:'}</span>
        {NEXT.filter((x) => mode !== 'task' || x[1] !== null).map(([l, d]) => <button key={l} className="opt" aria-pressed={next === d} onClick={() => setNext(d)}>{l}</button>)}
        <span className="faint" style={{ fontSize: 12, marginInlineStart: 'auto' }}>Enter يبعت · Shift+Enter سطر جديد</span>
      </div>
    </div>
  );
}

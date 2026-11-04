import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { errorText } from '../../api/errors';
import { useBootstrap, upsertLead, qk } from '../../api/queries';
import { Modal, Spinner } from '../../ui/kit';
import { useToast } from '../../ui/toast';

/** A new conversation: only a name is required; everything else can come later. */
export function NewLead({ onClose }: { onClose: () => void }) {
  const { data: b } = useBootstrap();
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ business: '', name: '', phone: '', email: '', city: '', source: '', service: '', owner: b?.me.name || '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [dup, setDup] = useState<{ id: string; name: string } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const lists = b?.lists || {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.business.trim() && !f.name.trim()) { setErr('اكتب اسم النشاط أو اسم الشخص'); return; }
    setBusy(true); setErr(''); setDup(null);
    try {
      const data: Record<string, string> = {};
      Object.entries(f).forEach(([k, v]) => { if (v.trim()) data[k] = v.trim(); });
      const r = await api.saveLead(data);
      if (!r.ok && r.error === 'duplicate') { setDup({ id: r.id || '', name: r.name || '' }); return; }
      if (r.lead) { upsertLead(qc, r.lead); qc.invalidateQueries({ queryKey: qk.boot }); toast({ text: 'محادثة جديدة مع ' + (r.lead.business || r.lead.name) }); onClose(); nav('/chats/' + r.lead.id); }
    } catch (x) { setErr(errorText(x, 'ar')); } finally { setBusy(false); }
  }
  const opt = (k: string) => (lists[k] || []).map((v) => <option key={v} value={v}>{v}</option>);

  return (
    <Modal title="محادثة جديدة" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal__body">
          <div className="form2">
            <label className="field"><span>اسم النشاط</span><input className="input" value={f.business} onChange={set('business')} placeholder="معرض النور للأثاث" autoFocus /></label>
            <label className="field"><span>اسم الشخص</span><input className="input" value={f.name} onChange={set('name')} placeholder="أ. محمود" /></label>
            <label className="field"><span>الموبايل</span><input className="input" dir="ltr" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="+20 10 0000 0000" /></label>
            <label className="field"><span>الإيميل</span><input className="input" dir="ltr" type="email" value={f.email} onChange={set('email')} /></label>
            <label className="field"><span>المدينة</span><input className="input" value={f.city} onChange={set('city')} /></label>
            <label className="field"><span>جه منين؟</span><select className="select" value={f.source} onChange={set('source')}><option value="">—</option>{opt('المصدر')}</select></label>
            <label className="field"><span>مهتم بإيه؟</span><select className="select" value={f.service} onChange={set('service')}><option value="">—</option>{opt('الخدمة')}</select></label>
            <label className="field"><span>المسؤول</span><select className="select" value={f.owner} onChange={set('owner')}>{(b?.team || []).filter((t) => t.active).map((t) => <option key={t.email} value={t.name}>{t.name}</option>)}</select></label>
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          {dup && <p className="err" role="alert">العميل ده موجود قبل كده: <button type="button" className="btn btn--sm" onClick={() => { onClose(); nav('/chats/' + dup.id); }}>افتح محادثة «{dup.name}»</button></p>}
        </div>
        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" disabled={busy}>{busy ? <Spinner /> : 'ابدأ المحادثة'}</button>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootstrap } from '../../api/queries';
import { config } from '../../config';
import { conversations, filterConvs } from '../../lib/inbox';
import { Modal } from '../../ui/kit';
import { Icon } from '../../ui/Icon';

const FLOW = [
  ['1', 'عميل جديد', 'بييجي من الموقع أو تضيفه بزرار «محادثة جديدة»'],
  ['2', 'متابعة', 'كل مكالمة وواتساب وملاحظة بتتسجل في الخيط'],
  ['3', 'صفقة', 'اجتماع ← عرض ← تفاوض، على خط الرحلة فوق'],
  ['4', 'عميل', 'لما يقبل، يبقى «عميل نشط» وليه اشتراك شهري'],
  ['5', 'فلوس', 'الفاتورة والدفعات في «الفلوس»']
];
export const SHORTCUTS: [string[], string][] = [
  [['Ctrl', 'K'], 'دوّر على أي عميل أو أمر'],
  [['N'], 'محادثة جديدة'],
  [['J', 'K'], 'المحادثة اللي بعدها / قبلها'],
  [['/'], 'خانة البحث'],
  [['Enter'], 'ابعت اللي كتبته في الخيط'],
  [['?'], 'الشاشة دي']
];

/** «كيف يعمل؟»: what the system is, where the data lives, the shortcuts, and a 6-step tour. No video. */
export function Guide({ onClose }: { onClose: () => void }) {
  const [tour, setTour] = useState(false);
  const { data: b } = useBootstrap();
  const nav = useNavigate();
  function startTour() {
    if (b) {
      const first = filterConvs(conversations(b.leads, b.tasks, b.bookings), 'waiting')[0] || filterConvs(conversations(b.leads, b.tasks, b.bookings), 'all')[0];
      if (first) nav('/chats/' + first.lead.id);
    }
    setTour(true);
  }
  if (tour) return <Tour onClose={onClose} />;
  return (
    <Modal title="كيف يعمل؟" onClose={onClose} wide>
      <div className="modal__body guide">
        <p style={{ margin: 0, fontSize: 16 }}><b>الفكرة:</b> كل عميل = محادثة. بدل جداول وشاشات كتير، كل اللي حصل مع العميل في خيط واحد زي الواتساب، وفوقه خط بيقولك هو فين في الرحلة، وتحته خانة واحدة تسجّل فيها أي حاجة.</p>
        <div className="flow">{FLOW.map(([n, t, d]) => <div key={n}><i>{n}</i><b>{t}</b><span className="muted">{d}</span></div>)}</div>
        <div className="form2">
          <section>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>البيانات فين؟</h3>
            {config.mock ? (
              <p className="muted" style={{ margin: 0 }}>دي نسخة تجريبية: البيانات وهمية ومحفوظة في المتصفح بس. النسخة الحقيقية بتقرا وتكتب في Google Sheet عن طريق Apps Script: تابات العملاء، التواصل، المهام، الاجتماعات، العروض والفواتير والمدفوعات، والفريق.</p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>كل حاجة محفوظة في Google Sheet بتاع الشركة (تابات العملاء، التواصل، المهام، الاجتماعات، العروض والفواتير والمدفوعات، والفريق). الموقع ده بيقرا ويكتب فيه بس عن طريق Apps Script، ومحدش يدخل غير اللي إيميله في تاب «الفريق».</p>
            )}
            <h3 style={{ margin: '16px 0 8px', fontSize: 16 }}>مين «مستني ردّك»؟</h3>
            <p className="muted" style={{ margin: 0 }}>اللي متابعته عدّت، أو عنده حاجة النهارده، أو جديد ومحدش كلّمه، أو ساكت من أكتر من أسبوع وهو لسه في الطريق.</p>
          </section>
          <section>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>أهم الاختصارات</h3>
            <div className="keys">{SHORTCUTS.map(([k, d]) => <div key={d}><span>{k.map((x) => <span key={x} className="kbd">{x}</span>)}</span><span>{d}</span></div>)}</div>
            <p className="hint">الحروف شغالة حتى لو الكيبورد عربي.</p>
          </section>
        </div>
      </div>
      <div className="modal__foot">
        <button className="btn btn--ghost" onClick={onClose}>تمام، فهمت</button>
        <button className="btn btn--primary" onClick={startTour}><Icon name="sparkle" size={18} />جولة سريعة (6 خطوات)</button>
      </div>
    </Modal>
  );
}

const STEPS = [
  { sel: '[data-tour="list"]', title: 'المحادثات', body: 'كل عميل هنا محادثة. اللي فوق هم اللي مستنيين ردّك، وجنب كل واحد السبب (متأخر، النهارده، جديد…).' },
  { sel: '[data-tour="filters"]', title: 'الفلاتر', body: 'بدّل بين: مستنيين ردّك، النهارده، الجداد، اللي في الطريق، والعملاء.' },
  { sel: '[data-tour="road"]', title: 'خط الرحلة', body: 'العميل واقف فين من «جديد» لـ «عميل». دوس على أي نقطة تنقله، ولو غلطت فيه «تراجع».' },
  { sel: '[data-tour="composer"]', title: 'خانة واحدة لكل حاجة', body: 'اختار: ملاحظة، مكالمة، واتساب (بقوالب جاهزة)، إيميل، مهمة، أو ردّه. والاقتراحات فوق بتقولك الخطوة الجاية.' },
  { sel: '[data-tour="rail"]', title: 'الأقسام', body: '«يومي» للمواعيد والمهام، «النبض» للأرقام، «الفلوس» للعروض والفواتير.' },
  { sel: '[data-tour="how"]', title: 'لو نسيت', body: 'الزرار ده بيرجّعك هنا في أي وقت. أو دوس ?' }
];

function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];
  useLayoutEffect(() => {
    let tries = 0, t = 0;
    const find = () => {
      const el = document.querySelector(step.sel);
      if (el && el.getBoundingClientRect().width > 0) { setRect(el.getBoundingClientRect()); return; }
      if (tries++ < 10) t = window.setTimeout(find, 80); else setRect(null);
    };
    find();
    return () => clearTimeout(t);
  }, [step.sel]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') setI((x) => Math.min(STEPS.length - 1, x + 1)); if (e.key === 'ArrowRight') setI((x) => Math.max(0, x - 1)); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const pad = 6;
  const tipTop = rect ? (rect.bottom + 180 < innerHeight ? rect.bottom + 14 : Math.max(16, rect.top - 190)) : innerHeight / 2 - 90;
  const tipLeft = rect ? Math.min(innerWidth - 336, Math.max(16, rect.left + rect.width / 2 - 160)) : innerWidth / 2 - 160;
  const last = i === STEPS.length - 1;
  return (
    <>
      <div className="tour-ring" style={rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : { top: '50%', left: '50%', width: 0, height: 0 }} />
      <div className="tour-tip" role="dialog" aria-modal="true" aria-label={step.title} style={{ top: tipTop, left: tipLeft }}>
        <h4>{step.title}</h4>
        <p>{step.body}</p>
        <footer>
          <span className="num">{i + 1} / {STEPS.length}</span>
          <button className="btn btn--sm btn--ghost" onClick={onClose}>اقفل</button>
          {i > 0 && <button className="btn btn--sm" onClick={() => setI(i - 1)}>السابق</button>}
          <button className="btn btn--sm btn--primary" autoFocus onClick={() => (last ? onClose() : setI(i + 1))}>{last ? 'يلا نبدأ' : 'التالي'}</button>
        </footer>
      </div>
    </>
  );
}

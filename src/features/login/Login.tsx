import { useRef, useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { errorText } from '../../api/errors';
import { config } from '../../config';
import { useAuth } from '../../app/auth';
import { Icon } from '../../ui/Icon';
import { Spinner } from '../../ui/kit';
import { latinDigits } from '../../lib/format';

const DEMO_EMAIL = 'abdallah@magmafy.com';

/** Signing in is a short conversation: we ask for the email, then for the 6-digit code. */
export function Login() {
  const { signIn } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(config.mock ? DEMO_EMAIL : '');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setErr('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setErr('اكتب إيميل صحيح'); return; }
    setBusy(true);
    try {
      await api.requestCode(email.trim());
      setStep('code');
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (x) { setErr(errorText(x, 'ar')); } finally { setBusy(false); }
  }
  async function verify(digits: string) {
    setBusy(true); setErr('');
    try {
      const r = await api.verifyCode(email.trim(), digits);
      signIn(r.token);
    } catch (x) {
      setErr(errorText(x, 'ar'));
      setCode(['', '', '', '', '', '']);
      setTimeout(() => boxes.current[0]?.focus(), 30);
    } finally { setBusy(false); }
  }
  function onDigit(i: number, raw: string) {
    const v = latinDigits(raw).replace(/\D/g, '');
    const next = code.slice();
    if (v.length > 1) { v.slice(0, 6).split('').forEach((d, k) => { if (i + k < 6) next[i + k] = d; }); }
    else next[i] = v;
    setCode(next);
    const filled = next.join('');
    if (filled.length === 6) verify(filled);
    else if (v) boxes.current[Math.min(5, i + Math.max(1, v.length))]?.focus();
  }

  return (
    <div className="login">
      <section className="login__art" aria-hidden="true">
        <span className="logo"><i>M</i>Magmafy X</span>
        <div>
          <h1>كل عميل<br /><em>محادثة.</em></h1>
          <p>من أول رسالة لحد آخر فاتورة: خيط واحد لكل عميل، تعرف منه هو فين ومستني منك إيه.</p>
          <div className="ghosts">
            <div>أهلاً أستاذ فهد، وصلك العرض؟ 👋</div>
            <div>✓ اتقبل العرض: Q-0007</div>
            <div>📞 مكالمة: هيأكد يوم الخميس</div>
            <div>دفعة 1,200 USD اتسجلت</div>
          </div>
        </div>
        <span style={{ fontSize: 13, opacity: .6 }}>Magmafy · {new Date().getFullYear()}</span>
      </section>
      <main className="login__chat">
        <h2 className="sr">تسجيل الدخول</h2>
        <div className="b b--them">أهلاً بيك 👋<br />اكتب إيميل الشغل، وهنبعتلك كود دخول من 6 أرقام.</div>
        {step === 'email' ? (
          <form className="login__form" onSubmit={sendCode}>
            <label className="sr" htmlFor="email">الإيميل</label>
            <input id="email" className="input" type="email" dir="ltr" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus style={{ borderRadius: 999 }} />
            <button className="send" type="submit" disabled={busy} aria-label="ابعت الكود">{busy ? <Spinner /> : <Icon name="send" />}</button>
          </form>
        ) : (
          <>
            <div className="b b--me num" style={{ direction: 'ltr' }}>{email}</div>
            <div className="b b--them">تمام، بعتنا الكود على إيميلك. اكتبه هنا:</div>
            <div className="otp" role="group" aria-label="كود الدخول">
              {code.map((d, i) => (
                <input key={i} ref={(el) => { boxes.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={'الرقم ' + (i + 1)} maxLength={6} disabled={busy}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) boxes.current[i - 1]?.focus(); }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => { setStep('email'); setErr(''); }}>غيّر الإيميل</button>
              <button className="btn btn--ghost btn--sm" onClick={() => sendCode()} disabled={busy}>ابعت كود جديد</button>
            </div>
          </>
        )}
        {err && <p className="err" role="alert">{err}</p>}
        {config.mock ? (
          <p className="hint">نسخة تجريبية: أي إيميل يدخل، والكود <b className="num">123456</b>. الإيميل الجاهز بيدخلك كـ «عبد الله» (أدمن).</p>
        ) : (
          <p className="hint">الكود مش واصل؟ اتأكد إن إيميلك متسجّل في تاب «الفريق» في الشيت ومتفعّل.</p>
        )}
      </main>
    </div>
  );
}

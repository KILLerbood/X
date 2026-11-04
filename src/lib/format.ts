import { TZ, toDate, dayKey, todayKey, daysBetween } from './time';

const LOC = 'ar-EG-u-nu-latn-ca-gregory';
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOC, { timeZone: TZ, ...o });

export const fDate = (v: string | Date | null | undefined) => { const d = toDate(v); return d ? fmt({ day: 'numeric', month: 'short' }).format(d) : '—'; };
export const fTime = (v: string | Date | null | undefined) => { const d = toDate(v); return d ? fmt({ hour: 'numeric', minute: '2-digit' }).format(d) : ''; };
export const fDayLong = (v: string | Date | null | undefined) => { const d = toDate(v); return d ? fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d) : '—'; };
export const fMonthShort = (ym: string) => new Intl.DateTimeFormat(LOC, { month: 'short', timeZone: 'UTC' }).format(new Date(ym + '-15T00:00:00Z'));

/** «النهارده», «امبارح», «بكرة», «من 3 أيام», «بعد يومين». */
export function relDay(v: string | Date | null | undefined, today = todayKey()): string {
  const d = toDate(v);
  if (!d) return '—';
  const n = daysBetween(today, dayKey(d));
  if (n === 0) return 'النهارده';
  if (n === -1) return 'امبارح';
  if (n === 1) return 'بكرة';
  const k = Math.abs(n);
  const unit = k === 2 ? 'يومين' : k <= 10 ? k + ' أيام' : k + ' يوم';
  return n < 0 ? 'من ' + unit : 'بعد ' + unit;
}
/** Short time since: «دلوقتي», «5 د», «3 س», «2 يوم», then a date. */
export function ago(v: string | Date | null | undefined, now = Date.now()): string {
  const d = toDate(v);
  if (!d) return '';
  const s = (now - d.getTime()) / 1000;
  if (s < 60) return 'دلوقتي';
  if (s < 3600) return Math.floor(s / 60) + ' د';
  if (s < 86400) return Math.floor(s / 3600) + ' س';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' يوم';
  return fDate(d);
}
export const money = (n: unknown) => Math.round(Number(n) || 0).toLocaleString('en-US');
export const compact = (n: number) => (Math.abs(n) >= 1e6 ? (Math.round(n / 1e5) / 10) + 'M' : Math.abs(n) >= 1e4 ? Math.round(n / 1e3) + 'K' : money(n));
export const pct = (x: number | null | undefined) => (x == null ? '—' : Math.round(x * 100) + '%');
export const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
export const digits = (s: unknown) => latinDigits(String(s ?? '')).replace(/\D/g, '');

/** One or two letters for an avatar: «معرض الفخامة» → «ف», «Casa Living» → «CL». */
export function initials(s: string | null | undefined): string {
  const words = String(s || '').replace(/^(معرض|متجر|مصنع|مكتب|شركة|مؤسسة|بيت|دار|ستوديو)\s+/, '').split(/[\s\-–—،,]+/).filter((w) => /\p{L}/u.test(w));
  if (!words.length) return '؟';
  if (/^[A-Za-z]/.test(words[0])) return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return words[0].replace(/^ال(?=.{2,})/, '')[0];
}
/** A stable hue (0-359) for a name, so the same client always gets the same avatar colour. */
export function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

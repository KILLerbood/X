import { latinDigits, digits } from './format';

/** Fold Arabic spelling variants (hamza forms, ى/ي, ة/ه, tashkeel, tatweel) and case, so search finds what people meant. */
export function fold(s: unknown): string {
  return latinDigits(String(s ?? ''))
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}
/** Last 9 digits: 0551234567, +966551234567 and 00966 55 123 4567 are the same number. */
export const phoneKey = (s: unknown) => { const d = digits(s); return d.length > 9 ? d.slice(-9) : d; };

type Searchable = { name: string; business: string; city?: string; email?: string; phone?: string; id: string; owner?: string };
/**
 * How well a lead matches a query (0 = not at all). Every word must appear somewhere;
 * a match at the start of the name or business ranks higher. Phone numbers match in any format.
 */
export function score(l: Searchable, query: string): number {
  const q = fold(query);
  if (!q) return 1;
  const qd = digits(query);
  if (qd.length >= 4 && phoneKey(l.phone).includes(qd.length > 9 ? qd.slice(-9) : qd)) return 90;
  const hay = fold([l.business, l.name, l.city, l.email, l.id, l.owner].join(' '));
  const words = q.split(' ');
  if (!words.every((w) => hay.includes(w))) return 0;
  const title = fold(l.business + ' ' + l.name);
  let s = 10;
  if (title.startsWith(q)) s += 60;
  else {
    const starts = (w: string) => w.startsWith(words[0]) || w.replace(/^ال/, '').startsWith(words[0]);
    const ws = title.split(' ');
    if (starts(ws[0])) s += 40; else if (ws.some(starts)) s += 20;
  }
  return s;
}
export function search<T extends Searchable>(items: T[], query: string, limit = 50): T[] {
  if (!fold(query)) return items.slice(0, limit);
  return items.map((x) => [x, score(x, query)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([x]) => x);
}

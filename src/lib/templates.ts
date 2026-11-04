import type { Lead, Template, Booking } from '../api/schemas';
import { digits } from './format';
import { fDayLong, fTime } from './format';

/** Fills {{الاسم}}, {{النشاط}}, {{المدينة}}, {{المرسل}}, {{الموعد}}, ... Unknown variables are left visible so nothing is sent half-empty silently. */
export function fill(text: string, lead: Lead, ctx: { me: string; booking?: Booking | null; siteUrl?: string }): string {
  const first = (lead.name || lead.business || '').split(/\s+/)[0];
  const when = ctx.booking ? fDayLong(ctx.booking.startIso || ctx.booking.start) + ' الساعة ' + fTime(ctx.booking.startIso || ctx.booking.start) : '';
  const vars: Record<string, string> = {
    'الاسم': first, 'الاسم_الكامل': lead.name || lead.business, 'النشاط': lead.business || lead.name, 'المدينة': lead.city, 'المرسل': ctx.me,
    'الخدمة': lead.service, 'الموعد': when, 'نوع_الاجتماع': ctx.booking?.meetingType || '', 'رابط_الاجتماع': ctx.booking?.meetLink || '',
    'رابط_الحجز': ctx.siteUrl ? ctx.siteUrl.replace(/\/$/, '') + '/#book' : '', 'الموسم': 'رمضان'
  };
  return text.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (m, k: string) => (vars[k] ? vars[k] : m));
}
/** Templates for a channel, the ones made for this stage first. */
export function forChannel(templates: Template[], channel: 'واتساب' | 'إيميل', stage: string): Template[] {
  return templates.filter((t) => t.channel === channel && t.active !== false).sort((a, b) => Number(b.stage === stage) - Number(a.stage === stage));
}
/** A wa.me link (digits only, international). Returns '' when there's no usable number. */
export function waLink(phone: string, text: string): string {
  const d = digits(phone);
  if (d.length < 8) return '';
  return 'https://wa.me/' + d + '?text=' + encodeURIComponent(text);
}

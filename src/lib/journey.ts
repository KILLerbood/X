import { STAGES, PATH } from '../api/schemas';

/** The client's road: 8 steps from «جديد» to «عميل نشط». «متوقف» and «خسرناه» sit off the road. */
export const ROAD = PATH;
export const OFF_ROAD = ['متوقف', 'خسرناه'];
export const stepOf = (stage: string) => ROAD.indexOf(stage || 'جديد');
export const isOffRoad = (stage: string) => OFF_ROAD.includes(stage);
export const nextStage = (stage: string): string | null => {
  const i = stepOf(stage);
  return i >= 0 && i < ROAD.length - 1 ? ROAD[i + 1] : null;
};
/** 0..1 along the road (off-road stages count as 0). */
export const progress = (stage: string) => { const i = stepOf(stage); return i < 0 ? 0 : i / (ROAD.length - 1); };

/** Short labels that fit the journey line. */
export const SHORT: Record<string, string> = {
  'جديد': 'جديد', 'تم التواصل': 'اتكلمنا', 'اجتماع محجوز': 'اجتماع', 'تم الاجتماع': 'اتقابلنا', 'عرض مرسل': 'العرض',
  'تفاوض': 'تفاوض', 'فترة تجريبية': 'تجربة', 'عميل نشط': 'عميل', 'متوقف': 'متوقف', 'خسرناه': 'خسرناه'
};
/** One colour per stage (CSS variable name). */
export const stageTone = (stage: string) =>
  stage === 'عميل نشط' ? 'won' : stage === 'خسرناه' ? 'lost' : stage === 'متوقف' ? 'paused' : stepOf(stage) >= 4 ? 'hot' : stepOf(stage) >= 1 ? 'warm' : 'new';

/** What to do at each stage: the suggestion chips above the composer. */
export function suggestions(stage: string): { label: string; mode: 'call' | 'whatsapp' | 'note' | 'task' | 'email' | 'stage'; template?: string }[] {
  switch (stage) {
    case 'جديد': case '': return [{ label: 'رحّب بيه على واتساب', mode: 'whatsapp' }, { label: 'كلّمه دلوقتي', mode: 'call' }, { label: 'حدّد اجتماع', mode: 'stage' }];
    case 'تم التواصل': return [{ label: 'احجز اجتماع', mode: 'stage' }, { label: 'متابعة بعد يومين', mode: 'task' }];
    case 'اجتماع محجوز': return [{ label: 'ابعت تذكير بالاجتماع', mode: 'whatsapp', template: 'تذكير بالاجتماع' }, { label: 'الاجتماع خلص', mode: 'stage' }];
    case 'تم الاجتماع': return [{ label: 'سجّل ملخص الاجتماع', mode: 'note' }, { label: 'ابعت العرض', mode: 'stage' }];
    case 'عرض مرسل': return [{ label: 'اتطمّن إن العرض وصل', mode: 'whatsapp', template: 'متابعة بعد العرض' }, { label: 'ابعت متابعة بالإيميل', mode: 'email' }];
    case 'تفاوض': return [{ label: 'كلّمه نقفل', mode: 'call' }, { label: 'ابدأ فترة تجريبية', mode: 'stage' }];
    case 'فترة تجريبية': return [{ label: 'اسأله عن رأيه', mode: 'call' }, { label: 'حوّله لعميل', mode: 'stage' }];
    case 'عميل نشط': return [{ label: 'رسالة ترحيب', mode: 'email', template: 'ترحيب بعميل جديد' }, { label: 'مكالمة متابعة شهرية', mode: 'task' }];
    case 'متوقف': return [{ label: 'رسالة إعادة تنشيط', mode: 'whatsapp', template: 'إعادة تنشيط' }];
    default: return [{ label: 'اكتب ملاحظة', mode: 'note' }];
  }
}
export { STAGES };

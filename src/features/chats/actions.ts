import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { api } from '../../api/endpoints';
import { errorText } from '../../api/errors';
import { qk, upsertLead, upsertTask, refreshAfterWrite, patchBooking } from '../../api/queries';
import type { Lead } from '../../api/schemas';
import { useToast } from '../../ui/toast';

/** Every write from a conversation: one place for the toast, the cache update and the refresh. */
export function useLeadActions(leadId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <R,>(fn: () => Promise<R>, ok?: string, after?: (r: R) => void): Promise<R | null> => {
    setBusy(true);
    try {
      const r = await fn();
      const lead = (r as { lead?: Lead })?.lead;
      if (lead) upsertLead(qc, lead);
      after?.(r);
      refreshAfterWrite(qc, leadId);
      qc.invalidateQueries({ queryKey: qk.boot });
      if (ok) toast({ text: ok });
      return r;
    } catch (e) {
      toast({ text: errorText(e, 'ar'), bad: true });
      return null;
    } finally { setBusy(false); }
  }, [qc, toast, leadId]);

  return {
    busy,
    note: (summary: string, details = '') => run(() => api.addActivity({ leadId, kind: 'ملاحظة', direction: 'داخلي', summary, details }), 'اتسجلت الملاحظة'),
    call: (summary: string, details = '') => run(() => api.addActivity({ leadId, kind: 'مكالمة', direction: 'صادر', summary, details }), 'اتسجلت المكالمة'),
    incoming: (kind: string, summary: string) => run(() => api.addActivity({ leadId, kind, direction: 'وارد', summary, details: '' }), 'اتسجل رده'),
    whatsapp: (text: string, template: string) => run(() => api.logWhatsApp({ leadId, text, template }), 'اتسجلت رسالة الواتساب'),
    email: (subject: string, body: string) => run(() => api.sendEmail({ leadId, subject, body }), 'الإيميل اتبعت'),
    task: (task: string, due: string, owner: string) => run(() => api.addTask({ leadId, task, due, owner }), 'المهمة اتضافت', (r) => upsertTask(qc, r.task)),
    doneTask: (id: string) => run(() => api.setTask(id, 'تمت'), 'برافو، اتقفلت ✓', (r) => upsertTask(qc, r.task)),
    save: (patch: Record<string, unknown>, ok = 'اتحفظ') => run(() => api.saveLead({ id: leadId, ...patch }), ok),
    meeting: (id: string, status: string) => run(() => api.updateBooking(id, { status }), 'حالة الاجتماع: ' + status, () => patchBooking(qc, id, { status }))
  };
}

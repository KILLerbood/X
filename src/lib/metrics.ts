/** Change vs the previous period: null when there's nothing to compare with. */
export function delta(cur: number, prev: number): { pct: number; dir: 'up' | 'down' | 'flat' } | null {
  if (!prev) return cur ? { pct: 100, dir: 'up' } : null;
  const p = Math.round(((cur - prev) / prev) * 100);
  return { pct: Math.abs(p), dir: p > 0 ? 'up' : p < 0 ? 'down' : 'flat' };
}
/** Range of the last `days` days ending today, as yyyy-mm-dd. */
export function lastDays(days: number, today: string): { from: string; to: string } {
  const t = new Date(today + 'T12:00:00Z').getTime();
  return { from: new Date(t - (days - 1) * 864e5).toISOString().slice(0, 10), to: today };
}
/** Share of each funnel step relative to the first one (0..1). */
export const funnelShares = (steps: { count: number }[]) => { const top = Math.max(1, steps[0]?.count || 0); return steps.map((s) => Math.min(1, s.count / top)); };
/** Weighted forecast: the open pipeline value, each stage weighted by how likely it is to close. */
export const STAGE_WEIGHT: Record<string, number> = { 'تم التواصل': 0.1, 'اجتماع محجوز': 0.2, 'تم الاجتماع': 0.35, 'عرض مرسل': 0.5, 'تفاوض': 0.7, 'فترة تجريبية': 0.85 };
export const forecast = (rows: { stage: string; value: number }[]) => Math.round(rows.reduce((a, r) => a + (STAGE_WEIGHT[r.stage] || 0) * (r.value || 0), 0));

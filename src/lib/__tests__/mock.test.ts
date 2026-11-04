import { describe, it, expect, beforeAll } from 'vitest';

// The demo gateway runs in node with an in-memory localStorage.
beforeAll(() => {
  const m = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 };
});

describe('demo backend', () => {
  it('signs in with 123456, has عبد الله as admin, no سارة anywhere, and serves billing', async () => {
    const { mockGateway } = await import('../../api/mock/server');
    const bad = await mockGateway({ fn: 'crmVerifyCode', args: ['abdallah@magmafy.com', '111111'] });
    expect(bad.ok).toBe(false);
    const ok = await mockGateway({ fn: 'crmVerifyCode', args: ['abdallah@magmafy.com', '١٢٣٤٥٦'] });
    expect(ok.ok).toBe(true);
    const token = (ok.data as { token: string }).token;
    const boot = await mockGateway({ fn: 'crmBootstrap', args: [], token });
    const d = boot.data as { me: { name: string; isAdmin: boolean }; leads: unknown[] };
    expect(d.me).toMatchObject({ name: 'عبد الله', isAdmin: true });
    expect(d.leads.length).toBeGreaterThan(10);
    expect(JSON.stringify(boot.data)).not.toMatch(/(^|[^خ])سارة/);
    const bill = await mockGateway({ fn: 'crmBilling', args: [{}], token });
    const b = bill.data as { invoices: { id: string; balance: number }[]; quotes: unknown[] };
    expect(b.quotes.length).toBeGreaterThan(0);
    const open = b.invoices.find((i) => i.balance > 0)!;
    const pay = await mockGateway({ fn: 'crmRecordPayment', args: [open.id, { amount: open.balance }], token });
    expect(pay.ok).toBe(true);
    expect((pay.data as { invoice: { status: string } }).invoice.status).toBe('مدفوعة');
    const over = await mockGateway({ fn: 'crmRecordPayment', args: [open.id, { amount: 5 }], token });
    expect(over.ok).toBe(false);
  }, 20000);
  it('lets any email in as a demo admin', async () => {
    const { mockGateway } = await import('../../api/mock/server');
    const r = await mockGateway({ fn: 'crmVerifyCode', args: ['guest@test.com', '123456'] });
    expect(r.ok).toBe(true);
  });
});

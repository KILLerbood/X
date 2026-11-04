import { store } from '../lib/storage';

export type Theme = 'light' | 'dark';
const KEY = 'crmx-theme';
export const getTheme = (): Theme => (store.get(KEY) === 'dark' ? 'dark' : 'light');
export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#12110f' : '#f6f2ec');
}
export function setTheme(t: Theme) { store.set(KEY, t); applyTheme(t); }

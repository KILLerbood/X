import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useBootstrap } from '../api/queries';
import { Icon } from '../ui/Icon';
import { UiCtx, typing } from './ui';
import { Palette } from '../features/palette/Palette';
import { NewLead } from '../features/chats/NewLead';
import { Guide } from '../features/guide/Guide';
import { conversations, counts } from '../lib/inbox';
import { todayKey, dayKey } from '../lib/time';
import { getTheme, setTheme, type Theme } from './theme';
import { useAuth } from './auth';
import { Avatar } from '../ui/kit';

export function Shell() {
  const [palette, setPalette] = useState(false);
  const [newLead, setNewLead] = useState(false);
  const [guide, setGuide] = useState(false);
  const [theme, setT] = useState<Theme>(getTheme);
  const { signOut } = useAuth();
  const boot = useBootstrap();
  const b = boot.data;

  const badges = useMemo(() => {
    if (!b) return { chats: 0, agenda: 0 };
    const c = counts(conversations(b.leads, b.tasks, b.bookings, b.settings.staleDays || 7));
    const t = todayKey();
    const agenda = b.tasks.filter((x) => x.status === 'مفتوحة' && dayKey(x.due) <= t).length + b.bookings.filter((x) => dayKey(x.startIso || x.start) === t && x.status !== 'ملغي').length;
    return { chats: c.waiting, agenda };
  }, [b]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') { e.preventDefault(); setPalette((x) => !x); return; }
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyN') { e.preventDefault(); setNewLead(true); }
      else if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) { e.preventDefault(); setGuide(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ui = useMemo(() => ({ openPalette: () => setPalette(true), openNewLead: () => setNewLead(true), openGuide: () => setGuide(true) }), []);
  const flip = () => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); setT(n); };

  return (
    <UiCtx.Provider value={ui}>
      <div className="app">
        <nav className="rail" aria-label="الأقسام" data-tour="rail">
          <div className="rail__logo" aria-hidden="true">M<b>x</b></div>
          <NavLink to="/chats"><Icon name="chat" /><span>المحادثات</span>{badges.chats > 0 && <span className="badge num">{badges.chats}</span>}</NavLink>
          <NavLink to="/agenda"><Icon name="agenda" /><span>يومي</span>{badges.agenda > 0 && <span className="badge num">{badges.agenda}</span>}</NavLink>
          <NavLink to="/pulse"><Icon name="pulse" /><span>النبض</span></NavLink>
          <NavLink to="/money"><Icon name="money" /><span>الفلوس</span></NavLink>
          <div className="rail__spacer" />
          <button className="btn btn--ghost btn--icon rail__extra" onClick={flip} aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الغامق'} title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الغامق'}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} /></button>
          {b && <span className="rail__extra" title={b.me.name + ' · ' + b.me.role} style={{ margin: '6px 0' }}><Avatar name={b.me.name} size={36} /></span>}
          <button className="btn btn--ghost btn--icon rail__extra" onClick={signOut} aria-label="خروج" title="خروج"><Icon name="logout" size={20} /></button>
        </nav>
        <main className="main" id="main">
          <Outlet />
        </main>
      </div>
      <button className="how" onClick={() => setGuide(true)} data-tour="how"><Icon name="help" />كيف يعمل؟</button>
      {palette && <Palette onClose={() => setPalette(false)} onNewLead={() => { setPalette(false); setNewLead(true); }} onTheme={flip} onGuide={() => { setPalette(false); setGuide(true); }} />}
      {newLead && <NewLead onClose={() => setNewLead(false)} />}
      {guide && <Guide onClose={() => setGuide(false)} />}
    </UiCtx.Provider>
  );
}

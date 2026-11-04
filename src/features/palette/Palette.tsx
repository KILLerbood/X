import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootstrap } from '../../api/queries';
import { search } from '../../lib/arabic';
import { Avatar, Modal } from '../../ui/kit';
import { Icon } from '../../ui/Icon';

type Item = { id: string; group: string; label: string; hint?: string; icon?: string; avatar?: { name: string; stage: string }; run: () => void };

/** Ctrl+K: jump to any client or run any command, from anywhere. */
export function Palette({ onClose, onNewLead, onTheme, onGuide }: { onClose: () => void; onNewLead: () => void; onTheme: () => void; onGuide: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const { data: b } = useBootstrap();
  const nav = useNavigate();
  const go = (to: string) => () => { onClose(); nav(to); };

  const items = useMemo<Item[]>(() => {
    const commands: Item[] = [
      { id: 'new', group: 'أوامر', label: 'محادثة جديدة', hint: 'N', icon: 'plus', run: onNewLead },
      { id: 'agenda', group: 'أوامر', label: 'روح لـ «يومي»', icon: 'agenda', run: go('/agenda') },
      { id: 'pulse', group: 'أوامر', label: 'روح لـ «النبض»', icon: 'pulse', run: go('/pulse') },
      { id: 'money', group: 'أوامر', label: 'روح لـ «الفلوس»', icon: 'money', run: go('/money') },
      { id: 'waiting', group: 'أوامر', label: 'المحادثات المستنية ردّك', icon: 'chat', run: go('/chats') },
      { id: 'theme', group: 'أوامر', label: 'بدّل الوضع الفاتح/الغامق', icon: 'moon', run: () => { onTheme(); onClose(); } },
      { id: 'guide', group: 'أوامر', label: 'كيف يعمل؟', hint: '?', icon: 'help', run: onGuide }
    ];
    const cmd = q ? commands.filter((c) => c.label.includes(q.trim())) : commands;
    const leads = b ? search(b.leads, q, q ? 8 : 5).map<Item>((l) => ({ id: l.id, group: 'عملاء', label: l.business || l.name, hint: [l.name !== (l.business || l.name) ? l.name : '', l.stage, l.city].filter(Boolean).join(' · '), avatar: { name: l.business || l.name, stage: l.stage }, run: go('/chats/' + l.id) })) : [];
    return q ? [...leads, ...cmd] : [...cmd, ...leads];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, b]);
  const i = Math.min(sel, Math.max(0, items.length - 1));

  return (
    <Modal onClose={onClose} className="palette" label="بحث وأوامر">
      <label className="sr" htmlFor="pal">دوّر على عميل أو أمر</label>
      <input id="pal" className="input" autoFocus value={q} placeholder="دوّر على عميل أو اكتب أمر…" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-activedescendant={items[i] ? 'pal-' + items[i].id : undefined}
        onChange={(e) => { setQ(e.target.value); setSel(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i + 1) % Math.max(1, items.length)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i - 1 + items.length) % Math.max(1, items.length)); }
          else if (e.key === 'Enter' && items[i]) { e.preventDefault(); items[i].run(); }
        }} />
      <div className="palette__list" id="pal-list" role="listbox" aria-label="النتايج">
        {!items.length && <p className="faint" style={{ padding: 12, margin: 0 }}>مفيش نتيجة لـ «{q}»</p>}
        {items.map((it, k) => (
          <div key={it.group + it.id} style={{ display: 'contents' }}>
            {(k === 0 || items[k - 1].group !== it.group) && <div className="palette__group">{it.group}</div>}
            <button id={'pal-' + it.id} role="option" aria-selected={k === i} className="palette__item" onMouseEnter={() => setSel(k)} onClick={it.run}>
              {it.avatar ? <Avatar name={it.avatar.name} stage={it.avatar.stage} size={32} /> : <Icon name={it.icon || 'bolt'} size={20} />}
              <span>{it.label}{it.hint && it.group === 'عملاء' ? <><br /><small>{it.hint}</small></> : null}</span>
              {it.hint && it.group === 'أوامر' && <span className="kbd">{it.hint}</span>}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

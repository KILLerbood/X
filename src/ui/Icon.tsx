/** A small hand-picked icon set (24px grid, stroke). No icon library. */
const P: Record<string, string> = {
  chat: 'M4 5h16v11H8l-4 4z',
  agenda: 'M4 6h16v14H4zM4 10h16M9 3v5M15 3v5',
  pulse: 'M3 12h4l3-7 4 14 3-7h4',
  money: 'M3 7h18v10H3zM12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M6 10v4M18 10v4',
  search: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  send: 'M4 12l16-8-6 16-2-7z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  wa: 'M4 20l1.5-4.5A8 8 0 1 1 8.5 18.5zM9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  note: 'M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h5',
  task: 'M4 12l4 4 8-9M14 18h6',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  back: 'M9 6l6 6-6 6',
  info: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 11v5M12 8v.01',
  help: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17v.01',
  meet: 'M3 7h12v10H3zM15 10l6-3v10l-6-3',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10',
  sun: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  panel: 'M4 4h16v16H4zM14 4v16',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  arrow: 'M19 12H5M11 6l-6 6 6 6',
  clock: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2',
  user: 'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21c1-4 4-6 8-6s7 2 8 6',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5'
};
export type IconName = keyof typeof P;
export function Icon({ name, size, className }: { name: IconName | string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || P.info} />
    </svg>
  );
}

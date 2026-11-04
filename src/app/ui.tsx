import { createContext, useContext } from 'react';

export type Ui = { openPalette: () => void; openNewLead: () => void; openGuide: () => void };
export const UiCtx = createContext<Ui>({ openPalette: () => {}, openNewLead: () => {}, openGuide: () => {} });
export const useUi = () => useContext(UiCtx);

/** True while the user is typing somewhere, so single-key shortcuts stay out of the way. */
export const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
};

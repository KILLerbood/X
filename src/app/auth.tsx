import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { session } from '../api/client';
import { api } from '../api/endpoints';

type Auth = { signedIn: boolean; signIn: (token: string) => void; signOut: () => void };
const Ctx = createContext<Auth>({ signedIn: false, signIn: () => {}, signOut: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(() => !!session.token);
  const qc = useQueryClient();
  useEffect(() => session.onLost(() => { setSignedIn(false); qc.clear(); }), [qc]);
  const signIn = useCallback((t: string) => { session.set(t); setSignedIn(true); }, []);
  const signOut = useCallback(() => {
    const t = session.token;
    session.clear(); qc.clear(); setSignedIn(false);
    if (t) api.logout(t).catch(() => {});
  }, [qc]);
  return <Ctx.Provider value={{ signedIn, signIn, signOut }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

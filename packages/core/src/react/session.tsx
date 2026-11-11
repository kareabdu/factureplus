"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface EtatSession {
  chargement: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  deconnecter: () => Promise<void>;
}

const SessionContext = createContext<EtatSession | null>(null);

/** Session Supabase courante, partagée par toute l'application. */
export function SessionProvider({ supabase, children }: { supabase: SupabaseClient; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!actif) return;
      setSession(data.session);
      setChargement(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) => {
      setSession(s);
      setChargement(false);
    });
    return () => {
      actif = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const valeur = useMemo<EtatSession>(() => ({
    chargement,
    session,
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
    deconnecter: async () => {
      await supabase.auth.signOut();
    },
  }), [chargement, session, supabase]);

  return <SessionContext.Provider value={valeur}>{children}</SessionContext.Provider>;
}

export function useSession(): EtatSession {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession doit être utilisé dans <SessionProvider>");
  return v;
}

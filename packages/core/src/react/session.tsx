"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface EtatSession {
  chargement: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  deconnecter: () => Promise<void>;
  /**
   * Session ouverte par un lien « Mot de passe oublié » : tant que le nouveau mot de passe n'est pas choisi,
   * l'application n'affiche que cet écran (le lien ne doit pas donner accès à l'espace).
   */
  reinitialisation: boolean;
  /** Nouveau mot de passe enregistré : l'espace devient accessible. */
  terminerReinitialisation: () => void;
}

const CLE_REINITIALISATION = "factureplus.reinitialisation";
const stockage = () => {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
};
const reinitialisationEnAttente = () => stockage()?.getItem(CLE_REINITIALISATION) === "1";

/**
 * À appeler dès qu'un lien de réinitialisation est reconnu, avant d'ouvrir sa session : l'écran
 * « Nouveau mot de passe » reste imposé même si l'application est fermée puis rouverte.
 */
export function marquerReinitialisation() {
  stockage()?.setItem(CLE_REINITIALISATION, "1");
}

const SessionContext = createContext<EtatSession | null>(null);

/** Session Supabase courante, partagée par toute l'application. */
export function SessionProvider({ supabase, children }: { supabase: SupabaseClient; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [chargement, setChargement] = useState(true);
  const [reinitialisation, setReinitialisation] = useState(false);

  useEffect(() => {
    let actif = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!actif) return;
      setSession(data.session);
      setReinitialisation(!!data.session && reinitialisationEnAttente());
      setChargement(false);
    });
    const { data } = supabase.auth.onAuthStateChange((evenement, s) => {
      if (evenement === "PASSWORD_RECOVERY") marquerReinitialisation();
      if (!s) stockage()?.removeItem(CLE_REINITIALISATION);
      setSession(s);
      setReinitialisation(!!s && reinitialisationEnAttente());
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
    reinitialisation,
    terminerReinitialisation: () => {
      stockage()?.removeItem(CLE_REINITIALISATION);
      setReinitialisation(false);
    },
  }), [chargement, session, supabase, reinitialisation]);

  return <SessionContext.Provider value={valeur}>{children}</SessionContext.Provider>;
}

export function useSession(): EtatSession {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession doit être utilisé dans <SessionProvider>");
  return v;
}

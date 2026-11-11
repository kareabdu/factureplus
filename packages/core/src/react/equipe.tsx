"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { chargerMesEquipes, chargerParametres, chargerProfil } from "../equipe";
import type { MonEquipe, Parametres, Profil } from "../types";

/**
 * Équipe active (= entreprise) de l'utilisateur, ses paramètres et son profil.
 * Phase 1 : une équipe par compte ; on prend la première.
 */
interface EtatEquipe {
  chargement: boolean;
  erreur: string | null;
  equipe: MonEquipe | null;
  /** Raccourci : id de l'équipe active (lève une erreur si absente) */
  equipeId: string;
  parametres: Parametres | null;
  profil: Profil | null;
  supabase: SupabaseClient;
  /** Recharge équipe, paramètres et profil (après création, modification des paramètres…) */
  rafraichir: () => Promise<void>;
}

const EquipeContext = createContext<EtatEquipe | null>(null);

export function EquipeProvider({
  supabase, userId, children,
}: { supabase: SupabaseClient; userId: string | null; children: ReactNode }) {
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<MonEquipe | null>(null);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);

  const charger = useCallback(async () => {
    if (!userId) {
      setEquipe(null);
      setParametres(null);
      setProfil(null);
      setChargement(false);
      return;
    }
    setErreur(null);
    try {
      const [equipes, p] = await Promise.all([chargerMesEquipes(supabase), chargerProfil(supabase, userId)]);
      const e = equipes[0] ?? null;
      setProfil(p);
      setEquipe(e);
      setParametres(e ? await chargerParametres(supabase, e.id) : null);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setChargement(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    // Chargement initial depuis Supabase : la mise à jour d'état est voulue ici.
    setChargement(true);
    void charger();
  }, [charger]);

  const valeur = useMemo<EtatEquipe>(() => ({
    chargement,
    erreur,
    equipe,
    get equipeId() {
      if (!equipe) throw new Error("Aucune équipe active");
      return equipe.id;
    },
    parametres,
    profil,
    supabase,
    rafraichir: charger,
  }), [chargement, erreur, equipe, parametres, profil, supabase, charger]);

  return <EquipeContext.Provider value={valeur}>{children}</EquipeContext.Provider>;
}

export function useEquipe(): EtatEquipe {
  const v = useContext(EquipeContext);
  if (!v) throw new Error("useEquipe doit être utilisé dans <EquipeProvider>");
  return v;
}

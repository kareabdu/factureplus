"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { suisAdminPlateforme } from "../administration";
import { chargerMesEquipes, chargerParametres, chargerProfil } from "../equipe";
import { etatAbonnement, type EtatAbonnement } from "../regles-abonnement";
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
  /** Administrateur de la plateforme FacturePlus */
  estAdmin: boolean;
  /** État d'accès (essai, abonné, expiré…) d'après le profil */
  abonnement: EtatAbonnement | null;
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
  const [estAdmin, setEstAdmin] = useState(false);

  const charger = useCallback(async () => {
    if (!userId) {
      setEquipe(null);
      setParametres(null);
      setProfil(null);
      setEstAdmin(false);
      setChargement(false);
      return;
    }
    setErreur(null);
    try {
      const [equipes, p, admin] = await Promise.all([
        chargerMesEquipes(supabase), chargerProfil(supabase, userId), suisAdminPlateforme(supabase),
      ]);
      const e = equipes[0] ?? null;
      setProfil(p);
      setEstAdmin(admin);
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
    estAdmin,
    abonnement: profil ? etatAbonnement(profil, estAdmin) : null,
    supabase,
    rafraichir: charger,
  }), [chargement, erreur, equipe, parametres, profil, estAdmin, supabase, charger]);

  return <EquipeContext.Provider value={valeur}>{children}</EquipeContext.Provider>;
}

export function useEquipe(): EtatEquipe {
  const v = useContext(EquipeContext);
  if (!v) throw new Error("useEquipe doit être utilisé dans <EquipeProvider>");
  return v;
}

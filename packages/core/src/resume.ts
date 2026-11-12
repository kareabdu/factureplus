import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier } from "./erreurs";

export interface ResumeTableauDeBord {
  nb_produits: number;
  valeur_stock_achat: number;
  valeur_stock_vente: number;
  nb_alertes: number;
  nb_ruptures: number;
  ventes_periode: number;
  nb_factures_periode: number;
  /** Factures émises ou payées de l'année civile en cours (1er janvier – 31 décembre) */
  ventes_annee: number;
  nb_factures_annee: number;
  encaisse_periode: number;
  impayes: number;
  marge_periode: number;
  ventes_par_jour: { jour: string; total: number }[];
  meilleurs_produits: { produit_id: string; nom: string; quantite: number; chiffre: number }[];
}

/** Indicateurs de l'accueil depuis `debut` (par défaut : début du mois). */
export async function chargerResume(sb: SupabaseClient, equipeId: string, debut?: string): Promise<ResumeTableauDeBord> {
  const r = verifier(await sb.rpc("resume_tableau_de_bord", debut ? { p_equipe: equipeId, p_debut: debut } : { p_equipe: equipeId }));
  // Les montants arrivent parfois en chaînes (numeric) : on normalise
  const nb = (v: unknown) => Number(v ?? 0);
  return {
    ...r,
    nb_produits: nb(r.nb_produits), valeur_stock_achat: nb(r.valeur_stock_achat), valeur_stock_vente: nb(r.valeur_stock_vente),
    nb_alertes: nb(r.nb_alertes), nb_ruptures: nb(r.nb_ruptures), ventes_periode: nb(r.ventes_periode),
    nb_factures_periode: nb(r.nb_factures_periode), ventes_annee: nb(r.ventes_annee), nb_factures_annee: nb(r.nb_factures_annee), encaisse_periode: nb(r.encaisse_periode), impayes: nb(r.impayes),
    marge_periode: nb(r.marge_periode),
    ventes_par_jour: (r.ventes_par_jour ?? []).map((j: { jour: string; total: unknown }) => ({ jour: j.jour, total: nb(j.total) })),
    meilleurs_produits: (r.meilleurs_produits ?? []).map((p: { produit_id: string; nom: string; quantite: unknown; chiffre: unknown }) => ({
      produit_id: p.produit_id, nom: p.nom, quantite: nb(p.quantite), chiffre: nb(p.chiffre),
    })),
  };
}

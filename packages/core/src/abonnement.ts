import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier } from "./erreurs";
import type { MoyenPaiementAbonnement, PlanAbonnement } from "./regles-abonnement";

// ---------------------------------------------------------------------------
// Paiement (fonctions Edge Unitech Pay)
// ---------------------------------------------------------------------------

export interface PaiementAbonnement {
  id: string;
  plan: PlanAbonnement;
  montant: number;
  moyen: MoyenPaiementAbonnement | "orange_qr" | "manuel";
  statut: "en_attente" | "paye" | "echoue" | "annule";
  reference: string | null;
  created_at: string;
  paye_le: string | null;
}

export interface ReponsePaiement {
  paiement_id: string;
  url_paiement: string | null;
  qr_code: string | null;
  liens: Record<string, string> | null;
}

export const LIBELLES_MOYENS_ABONNEMENT: Record<PaiementAbonnement["moyen"], string> = {
  wave: "Wave",
  orange_maxit: "Orange Money (Max It)",
  orange_qr: "Orange Money (QR)",
  manuel: "Manuel",
};

export const LIBELLES_STATUTS_PAIEMENT: Record<PaiementAbonnement["statut"], string> = {
  en_attente: "En attente",
  paye: "Payé",
  echoue: "Échoué",
  annule: "Annulé",
};

/** Appelle une fonction Edge et renvoie le message d'erreur qu'elle a produit (en français). */
async function appelerFonction<T>(sb: SupabaseClient, nom: string, corps: unknown): Promise<T> {
  const { data, error } = await sb.functions.invoke(nom, { body: corps as Record<string, unknown> });
  if (error) {
    let message = "Service de paiement indisponible. Réessayez.";
    const contexte = (error as { context?: Response }).context;
    try {
      const detail = await contexte?.json();
      if (detail?.error) message = String(detail.error);
    } catch {
      // réponse sans JSON : message générique
    }
    throw new Error(message);
  }
  return data as T;
}

export function lancerPaiementAbonnement(
  sb: SupabaseClient,
  saisie: { plan: PlanAbonnement; moyen: MoyenPaiementAbonnement; telephone?: string; retour?: string },
): Promise<ReponsePaiement> {
  return appelerFonction(sb, "unitech-paiement", saisie);
}

/** Vérifie les paiements en attente ; actif = un abonnement vient d'être activé. */
export function verifierPaiementAbonnement(sb: SupabaseClient): Promise<{ actif: boolean; en_attente: number }> {
  return appelerFonction(sb, "unitech-verifier", {});
}

export async function listerMesPaiements(sb: SupabaseClient, userId: string): Promise<PaiementAbonnement[]> {
  return verifier(await sb.from("paiements_abonnement").select("*").eq("utilisateur_id", userId)
    .order("created_at", { ascending: false }).limit(20)) ?? [];
}

/** Un paiement lancé récemment est encore en attente de confirmation. */
export function paiementEnCours(paiements: PaiementAbonnement[], maintenant = new Date()): PaiementAbonnement | null {
  return paiements.find((p) => p.statut === "en_attente"
    && maintenant.getTime() - new Date(p.created_at).getTime() < 2 * 86_400_000) ?? null;
}

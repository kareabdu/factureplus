import type { SupabaseClient } from "@supabase/supabase-js";

import type { PaiementAbonnement } from "./abonnement";
import type { EtatAcces, PlanAbonnement } from "./regles-abonnement";
import { verifier } from "./erreurs";
import type { Ton } from "./libelles";

// Administration de la plateforme FacturePlus (réservée aux administrateurs :
// contrôle côté serveur par prive.verifier_admin_plateforme).

export interface StatistiquesPlateforme {
  utilisateurs: number;
  nouveaux_7_jours: number;
  en_essai: number;
  abonnes: number;
  expires: number;
  revenus_mois: number;
  revenus_total: number;
  paiements_en_attente: number;
}

export interface UtilisateurPlateforme {
  id: string;
  email: string | null;
  nom_complet: string | null;
  telephone: string | null;
  created_at: string;
  essai_fin: string;
  abonnement_statut: string;
  abonnement_plan: PlanAbonnement | null;
  abonnement_fin: string | null;
  etat: EtatAcces;
  entreprise: string | null;
  documents: number;
  derniere_activite: string | null;
}

export interface PaiementPlateforme extends Pick<PaiementAbonnement, "id" | "plan" | "montant" | "moyen" | "statut" | "reference" | "created_at" | "paye_le"> {
  utilisateur_id: string;
  email: string | null;
}

export const LIBELLES_ETATS_ACCES: Record<EtatAcces, string> = {
  admin: "Administrateur",
  actif: "Abonné",
  essai: "Essai",
  expire: "Expiré",
};

export const TONS_ETATS_ACCES: Record<EtatAcces, Ton> = { admin: "info", actif: "succes", essai: "attention", expire: "danger" };

export async function suisAdminPlateforme(sb: SupabaseClient): Promise<boolean> {
  const { data, error } = await sb.rpc("suis_admin_plateforme");
  return !error && data === true;
}

export async function statistiquesPlateforme(sb: SupabaseClient): Promise<StatistiquesPlateforme> {
  const s = verifier(await sb.rpc("admin_statistiques")) as Record<string, number | string>;
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Number(v)])) as unknown as StatistiquesPlateforme;
}

export async function listerUtilisateursPlateforme(sb: SupabaseClient, recherche = ""): Promise<UtilisateurPlateforme[]> {
  const lignes: UtilisateurPlateforme[] = verifier(await sb.rpc("admin_utilisateurs", { p_recherche: recherche.trim() || null })) ?? [];
  return lignes.map((u) => ({ ...u, documents: Number(u.documents) }));
}

export async function listerPaiementsPlateforme(sb: SupabaseClient, limite = 200): Promise<PaiementPlateforme[]> {
  const lignes: PaiementPlateforme[] = verifier(await sb.rpc("admin_paiements", { p_limite: limite })) ?? [];
  return lignes.map((p) => ({ ...p, montant: Number(p.montant) }));
}

/** Active (plan + date de fin, montant encaissé facultatif) ou arrête l'accès (plan null). */
export async function definirAbonnement(
  sb: SupabaseClient, utilisateurId: string, plan: PlanAbonnement | null, fin?: string | null, montant = 0,
) {
  verifier(await sb.rpc("admin_definir_abonnement", {
    p_utilisateur: utilisateurId, p_plan: plan, p_fin: fin ?? null, p_montant: montant,
  }));
}

export async function prolongerEssai(sb: SupabaseClient, utilisateurId: string, jours: number) {
  verifier(await sb.rpc("admin_prolonger_essai", { p_utilisateur: utilisateurId, p_jours: jours }));
}

/** Date de fin proposée pour une activation manuelle (AAAA-MM-JJ). */
export function finProposee(plan: PlanAbonnement, depuis = new Date()): string {
  const d = new Date(depuis);
  d.setDate(d.getDate() + (plan === "annuel" ? 365 : 30));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Export CSV (séparateur « ; » pour Excel en français). */
export function csvUtilisateurs(utilisateurs: UtilisateurPlateforme[]): string {
  const echapper = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const entete = ["E-mail", "Nom", "Téléphone", "Entreprise", "Inscription", "État", "Plan", "Fin d'abonnement", "Fin d'essai", "Documents"];
  const lignes = utilisateurs.map((u) => [
    u.email, u.nom_complet, u.telephone, u.entreprise, u.created_at.slice(0, 10), LIBELLES_ETATS_ACCES[u.etat],
    u.abonnement_plan ?? "", u.abonnement_fin ?? "", u.essai_fin.slice(0, 10), u.documents,
  ].map(echapper).join(";"));
  return [entete.join(";"), ...lignes].join("\n");
}

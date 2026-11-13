import type { Profil } from "./types";

// ---------------------------------------------------------------------------
// Tarifs et état d'accès — identiques à supabase/migrations/…_abonnement.sql
// (public.tarifs_abonnement et prive.etat_abonnement). Sans dépendance : testé par tests/regles.test.ts.
// ---------------------------------------------------------------------------

export type PlanAbonnement = "mensuel" | "annuel";
export type MoyenPaiementAbonnement = "wave" | "orange_maxit";

export const PLANS_ABONNEMENT: Record<PlanAbonnement, { libelle: string; montant: number; jours: number; periode: string }> = {
  mensuel: { libelle: "Mensuel", montant: 2900, jours: 30, periode: "/ mois" },
  annuel: { libelle: "Annuel", montant: 29000, jours: 365, periode: "/ an" },
};

/** Tarifs (FCFA). */
export const TARIFS = { mensuel: PLANS_ABONNEMENT.mensuel.montant, annuel: PLANS_ABONNEMENT.annuel.montant } as const;

/** Économie de l'annuel par rapport à 12 mois au tarif mensuel (FCFA). */
export const ECONOMIE_ANNUELLE = PLANS_ABONNEMENT.mensuel.montant * 12 - PLANS_ABONNEMENT.annuel.montant;

/** Max It remplace Orange Money : le paiement se fait dans l'application, sans numéro à saisir. */
export const MOYENS_PAIEMENT_ABONNEMENT: { code: MoyenPaiementAbonnement; libelle: string }[] = [
  { code: "wave", libelle: "Wave" },
  { code: "orange_maxit", libelle: "Max It" },
];

/** Bandeau d'avertissement affiché ce nombre de jours avant la fin de l'accès. */
export const JOURS_AVERTISSEMENT = 7;

export type EtatAcces = "admin" | "actif" | "essai" | "expire";

export interface EtatAbonnement {
  etat: EtatAcces;
  /** Fin de l'accès en cours (essai ou abonnement), null pour un administrateur. */
  fin: Date | null;
  /** Jours restants (arrondi supérieur), null pour un administrateur. */
  joursRestants: number | null;
  /** Fin proche (≤ JOURS_AVERTISSEMENT) ou accès expiré. */
  avertir: boolean;
  plan: PlanAbonnement | null;
}

type ProfilAbonnement = Pick<Profil, "abonnement_statut" | "abonnement_fin" | "essai_fin" | "abonnement_plan">;

/** Date du jour au format AAAA-MM-JJ (fuseau local). */
function aujourdhui(maintenant: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${maintenant.getFullYear()}-${p(maintenant.getMonth() + 1)}-${p(maintenant.getDate())}`;
}

/** Jours d'essai restants (négatif si l'essai est terminé). */
export function joursEssaiRestants(profil: Pick<Profil, "essai_fin">, maintenant = new Date()): number {
  return Math.ceil((new Date(profil.essai_fin).getTime() - maintenant.getTime()) / 86_400_000);
}

export function etatAbonnement(profil: ProfilAbonnement, estAdmin = false, maintenant = new Date()): EtatAbonnement {
  const plan = profil.abonnement_plan;
  if (estAdmin) return { etat: "admin", fin: null, joursRestants: null, avertir: false, plan };
  if (profil.abonnement_statut === "actif" && profil.abonnement_fin && profil.abonnement_fin >= aujourdhui(maintenant)) {
    // Accès jusqu'à la fin de la journée de fin
    const fin = new Date(`${profil.abonnement_fin}T23:59:59`);
    const jours = Math.max(0, Math.ceil((fin.getTime() - maintenant.getTime()) / 86_400_000));
    return { etat: "actif", fin, joursRestants: jours, avertir: jours <= JOURS_AVERTISSEMENT, plan };
  }
  const finEssai = new Date(profil.essai_fin);
  if (finEssai.getTime() > maintenant.getTime()) {
    const jours = joursEssaiRestants(profil, maintenant);
    return { etat: "essai", fin: finEssai, joursRestants: jours, avertir: jours <= JOURS_AVERTISSEMENT, plan };
  }
  const fin = profil.abonnement_fin ? new Date(`${profil.abonnement_fin}T23:59:59`) : finEssai;
  return { etat: "expire", fin, joursRestants: 0, avertir: true, plan };
}

/** Accès à l'application en écriture : abonnement actif ou essai en cours. */
export function accesActif(profil: ProfilAbonnement, maintenant = new Date()): boolean {
  return etatAbonnement(profil, false, maintenant).etat !== "expire";
}

/** Message court pour un bandeau (null si rien à signaler). */
export function messageAbonnement(e: EtatAbonnement): string | null {
  if (!e.avertir) return null;
  const date = e.fin?.toLocaleDateString("fr-FR");
  if (e.etat === "expire") return "Votre accès a expiré : vos données sont en lecture seule. Abonnez-vous pour continuer.";
  const j = e.joursRestants ?? 0;
  const reste = j <= 1 ? "Dernier jour" : `Plus que ${j} jours`;
  return e.etat === "essai"
    ? `${reste} d'essai gratuit (jusqu'au ${date}).`
    : `${reste} d'abonnement (jusqu'au ${date}). Pensez à renouveler.`;
}

/**
 * Liens à ouvrir, dans l'ordre, pour payer : Max It ouvre d'abord son application
 * (lien direct renvoyé par Unitech Pay), puis Orange Money, puis la page de paiement.
 * Wave : page de paiement (elle ouvre l'application Wave).
 */
export function liensOuverturePaiement(
  moyen: MoyenPaiementAbonnement,
  reponse: { url_paiement: string | null; liens: Record<string, string> | null },
): string[] {
  const liens = Object.fromEntries(
    Object.entries(reponse.liens ?? {}).map(([cle, url]) => [cle.toLowerCase().replace(/[^a-z]/g, ""), url]),
  );
  const ordre = moyen === "orange_maxit"
    ? [liens.maxit, liens.om, liens.orangemoney, reponse.url_paiement]
    : [reponse.url_paiement, liens.wave];
  return [...new Set(ordre.filter((u): u is string => typeof u === "string" && u.trim() !== ""))];
}

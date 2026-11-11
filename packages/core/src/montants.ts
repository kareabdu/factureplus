/**
 * Montants : toujours des entiers dans la devise de l'équipe (FCFA par défaut, sans
 * subdivision). On ne manipule jamais de nombres à virgule pour l'argent.
 * Quantités : jusqu'à 3 décimales (kg, litres…).
 */

/** Arrondit au franc le plus proche, symétrique pour les négatifs. */
export function arrondir(valeur: number): number {
  return Math.sign(valeur) * Math.round(Math.abs(valeur));
}

const formateurEntier = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const formateurQuantite = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

/** Espaces insécables : pas de retour à la ligne au milieu d'un nombre. */
const insecables = (s: string) => s.replace(/[\s ]/g, " ");

/** 1250000 → « 1 250 000 FCFA » */
export function formaterMontant(montant: number, symbole: string | null = "FCFA"): string {
  const nombre = insecables(formateurEntier.format(arrondir(montant)));
  return symbole ? `${nombre} ${symbole}` : nombre;
}

/** 2.5 → « 2,5 » ; 1000 → « 1 000 » */
export function formaterQuantite(quantite: number): string {
  return insecables(formateurQuantite.format(quantite));
}

/** Lit un montant saisi : « 1 250 000 », « 1.250.000 », « 1250000 FCFA ». null si invalide. */
export function lireMontant(saisie: string): number | null {
  const nettoye = saisie
    .replace(/f\s?cfa|xof|f$/gi, "")
    .replace(/[\s  .]/g, "")
    .trim();
  if (!/^\d+$/.test(nettoye)) return null;
  const valeur = Number(nettoye);
  return Number.isSafeInteger(valeur) ? valeur : null;
}

/** Lit une quantité saisie : « 2,5 », « 2.5 », « 10 ». null si invalide ou négative. */
export function lireQuantite(saisie: string): number | null {
  const nettoye = saisie.replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(nettoye)) return null;
  return Number(nettoye);
}

/**
 * Listes de choix partagées web / mobile : devises et unités usuelles.
 * Les montants restent des entiers (sans centimes), quelle que soit la devise.
 */

export type Devise = { code: string; libelle: string; symbole: string };

/** Devises proposées : Afrique de l'Ouest et du Nord d'abord, puis devises internationales. */
export const DEVISES: readonly Devise[] = [
  { code: "XOF", libelle: "Franc CFA BCEAO", symbole: "FCFA" },
  { code: "XAF", libelle: "Franc CFA BEAC", symbole: "FCFA" },
  { code: "GNF", libelle: "Franc guinéen", symbole: "GNF" },
  { code: "MAD", libelle: "Dirham marocain", symbole: "DH" },
  { code: "MRU", libelle: "Ouguiya mauritanien", symbole: "MRU" },
  { code: "GMD", libelle: "Dalasi gambien", symbole: "GMD" },
  { code: "CVE", libelle: "Escudo cap-verdien", symbole: "CVE" },
  { code: "NGN", libelle: "Naira nigérian", symbole: "₦" },
  { code: "GHS", libelle: "Cedi ghanéen", symbole: "GH₵" },
  { code: "SLE", libelle: "Leone sierra-léonais", symbole: "SLE" },
  { code: "LRD", libelle: "Dollar libérien", symbole: "LRD" },
  { code: "CDF", libelle: "Franc congolais", symbole: "FC" },
  { code: "DZD", libelle: "Dinar algérien", symbole: "DA" },
  { code: "TND", libelle: "Dinar tunisien", symbole: "DT" },
  { code: "EUR", libelle: "Euro", symbole: "€" },
  { code: "USD", libelle: "Dollar américain", symbole: "$" },
  { code: "GBP", libelle: "Livre sterling", symbole: "£" },
  { code: "CHF", libelle: "Franc suisse", symbole: "CHF" },
  { code: "CAD", libelle: "Dollar canadien", symbole: "$ CA" },
  { code: "CNY", libelle: "Yuan chinois", symbole: "¥" },
  { code: "JPY", libelle: "Yen japonais", symbole: "¥" },
  { code: "INR", libelle: "Roupie indienne", symbole: "₹" },
  { code: "AED", libelle: "Dirham des Émirats", symbole: "AED" },
  { code: "SAR", libelle: "Riyal saoudien", symbole: "SAR" },
  { code: "TRY", libelle: "Livre turque", symbole: "₺" },
];

/** Devise d'après son code (insensible à la casse). */
export function trouverDevise(code: string | null | undefined): Devise | undefined {
  const c = (code ?? "").toUpperCase();
  return DEVISES.find((d) => d.code === c);
}

/** Unités de mesure et conditionnements usuels (la saisie libre reste possible). */
export const UNITES: readonly string[] = [
  "Pcs", "Unité", "Lot", "Paire", "Douzaine",
  "kg", "g", "Tonne",
  "L", "cL", "mL",
  "m", "cm", "m²", "m³",
  "Carton", "Paquet", "Boîte", "Sac", "Sachet", "Bouteille", "Bidon", "Fût", "Pot", "Rouleau", "Caisse", "Palette", "Botte",
  "Heure", "Jour", "Mois", "Forfait",
];

/** Unités usuelles filtrées par la saisie (début de mot, sans accents ni casse). */
export function filtrerUnites(saisie: string): string[] {
  const normaliser = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const s = normaliser(saisie);
  if (!s || UNITES.some((u) => normaliser(u) === s)) return [...UNITES];
  return UNITES.filter((u) => normaliser(u).startsWith(s));
}

/**
 * Calcul de la taxe d'un document — même règle que la base (prive.recalculer_document),
 * reprise de l'ancienne app. Sert à l'aperçu en direct dans l'éditeur ; la base fait foi.
 */

export type TypeTaxe = "aucune" | "total" | "deduction" | "par_article";

export const TYPES_TAXE: { valeur: TypeTaxe; libelle: string }[] = [
  { valeur: "aucune", libelle: "Aucune" },
  { valeur: "total", libelle: "Sur le total" },
  { valeur: "deduction", libelle: "Déduction (retenue)" },
  { valeur: "par_article", libelle: "Par article" },
];

export interface ReglageTaxe {
  taxe_type: TypeTaxe;
  taxe_nom: string;
  taxe_taux: number;
  taxe_incluse: boolean;
}

export interface LigneCalcul {
  prix_unitaire: number;
  quantite: number;
  taxable?: boolean;
}

export interface Totaux {
  sous_total: number;
  base_taxable: number;
  montant_taxe: number;
  total: number;
}

const arrondi = (v: number) => Math.sign(v) * Math.round(Math.abs(v));

export function totalLigne(l: LigneCalcul): number {
  return arrondi(l.prix_unitaire * l.quantite);
}

export function calculerTotaux(lignes: LigneCalcul[], taxe: ReglageTaxe): Totaux {
  const sous_total = lignes.reduce((s, l) => s + totalLigne(l), 0);
  const base_taxable = lignes.filter((l) => l.taxable !== false).reduce((s, l) => s + totalLigne(l), 0);
  let montant_taxe = 0;
  let total = sous_total;
  const taux = Number(taxe.taxe_taux) || 0;
  if (taxe.taxe_type !== "aucune" && taux > 0) {
    if (taxe.taxe_incluse && taxe.taxe_type !== "deduction") {
      montant_taxe = arrondi(base_taxable - base_taxable / (1 + taux / 100));
    } else {
      montant_taxe = arrondi((base_taxable * taux) / 100) * (taxe.taxe_type === "deduction" ? -1 : 1);
      total = sous_total + montant_taxe;
    }
  }
  return { sous_total, base_taxable, montant_taxe, total };
}

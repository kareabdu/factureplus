// Dépenses : types, libellés, résumé et export CSV (sans dépendance, testé par tests/regles.test.ts).

export type CategorieDepense = "loyer" | "salaire" | "fournitures" | "transport" | "facture" | "impot" | "autre";
export type MoyenDepense = "especes" | "wave" | "orange_money" | "virement" | "cheque" | "carte" | "autre";

export interface Depense {
  id: string;
  equipe_id: string;
  commercant: string;
  montant: number;
  date_depense: string;
  categorie: CategorieDepense;
  moyen_paiement: MoyenDepense | null;
  description: string | null;
  recu_chemin: string | null;
  created_at: string;
}

export type SaisieDepense = Pick<Depense, "commercant" | "montant" | "date_depense" | "categorie" | "moyen_paiement" | "description" | "recu_chemin">;

export const CATEGORIES_DEPENSE: { code: CategorieDepense; libelle: string }[] = [
  { code: "loyer", libelle: "Loyer" },
  { code: "salaire", libelle: "Salaires" },
  { code: "fournitures", libelle: "Fournitures" },
  { code: "transport", libelle: "Transport" },
  { code: "facture", libelle: "Factures (eau, électricité…)" },
  { code: "impot", libelle: "Impôts et taxes" },
  { code: "autre", libelle: "Autre" },
];

export const LIBELLES_CATEGORIES_DEPENSE = Object.fromEntries(
  CATEGORIES_DEPENSE.map((c) => [c.code, c.libelle]),
) as Record<CategorieDepense, string>;

export const MOYENS_DEPENSE: { code: MoyenDepense; libelle: string }[] = [
  { code: "especes", libelle: "Espèces" },
  { code: "wave", libelle: "Wave" },
  { code: "orange_money", libelle: "Orange Money" },
  { code: "virement", libelle: "Virement" },
  { code: "cheque", libelle: "Chèque" },
  { code: "carte", libelle: "Carte bancaire" },
  { code: "autre", libelle: "Autre" },
];

export const LIBELLES_MOYENS_DEPENSE = Object.fromEntries(
  MOYENS_DEPENSE.map((m) => [m.code, m.libelle]),
) as Record<MoyenDepense, string>;

export interface ResumeDepenses {
  total: number;
  nombre: number;
  /** Catégories triées par montant décroissant */
  parCategorie: { categorie: CategorieDepense; libelle: string; montant: number; part: number }[];
}

export function resumerDepenses(depenses: Pick<Depense, "montant" | "categorie">[]): ResumeDepenses {
  const sommes = new Map<CategorieDepense, number>();
  let total = 0;
  for (const d of depenses) {
    total += d.montant;
    sommes.set(d.categorie, (sommes.get(d.categorie) ?? 0) + d.montant);
  }
  const parCategorie = [...sommes.entries()]
    .map(([categorie, montant]) => ({
      categorie, libelle: LIBELLES_CATEGORIES_DEPENSE[categorie], montant, part: total ? montant / total : 0,
    }))
    .sort((a, b) => b.montant - a.montant);
  return { total, nombre: depenses.length, parCategorie };
}

/** Export CSV (séparateur « ; » pour Excel en français, montants entiers). */
export function csvDepenses(depenses: Depense[]): string {
  const echapper = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const entete = ["Date", "Commerçant", "Catégorie", "Montant", "Moyen de paiement", "Description"];
  const lignes = depenses.map((d) => [
    d.date_depense, d.commercant, LIBELLES_CATEGORIES_DEPENSE[d.categorie], d.montant,
    d.moyen_paiement ? LIBELLES_MOYENS_DEPENSE[d.moyen_paiement] : "", d.description ?? "",
  ].map(echapper).join(";"));
  return [entete.join(";"), ...lignes].join("\n");
}

/**
 * Import / export du catalogue produits en tableau (CSV ou Excel) : colonnes, modèle, export,
 * et analyse d'un fichier importé (correspondance des colonnes, validation ligne par ligne,
 * rapprochement avec les produits existants) avant l'envoi à la RPC `importer_produits`.
 *
 * Module sans dépendance (testé par `pnpm test:core`) : la lecture des fichiers est dans `tableur.ts`.
 */
import type { Cellule, Tableau } from "./tableur";
import type { Categorie, Produit } from "./types";

export type ChampImportProduit =
  | "nom" | "reference" | "code_barres" | "categorie" | "description" | "unite"
  | "prix_vente" | "prix_achat" | "quantite" | "seuil_alerte" | "actif";

type Genre = "texte" | "montant" | "quantite" | "booleen";

interface ColonneProduit {
  champ: ChampImportProduit;
  entete: string;
  genre: Genre;
  /** Longueur maximale (texte) */
  max?: number;
  /** Autres intitulés reconnus à l'import (comparés sans accents ni ponctuation) */
  synonymes: string[];
}

/** Colonnes dans l'ordre de l'export et du modèle (d'après la table `produits`). */
export const COLONNES_PRODUITS: readonly ColonneProduit[] = [
  { champ: "nom", entete: "Nom", genre: "texte", max: 200, synonymes: ["nom", "nom du produit", "produit", "designation", "libelle", "article", "name"] },
  { champ: "reference", entete: "Référence", genre: "texte", max: 60, synonymes: ["reference", "ref", "code", "code produit", "code article", "sku"] },
  { champ: "code_barres", entete: "Code-barres", genre: "texte", max: 64, synonymes: ["code barres", "code barre", "codebarre", "codebarres", "ean", "ean13", "gtin", "barcode"] },
  { champ: "categorie", entete: "Catégorie", genre: "texte", max: 100, synonymes: ["categorie", "famille", "rayon", "category"] },
  { champ: "description", entete: "Description", genre: "texte", max: 2000, synonymes: ["description", "details", "detail"] },
  { champ: "unite", entete: "Unité", genre: "texte", max: 20, synonymes: ["unite", "unite de mesure", "conditionnement", "unit"] },
  { champ: "prix_vente", entete: "Prix de vente", genre: "montant", synonymes: ["prix de vente", "prix vente", "pv", "prix", "prix unitaire", "tarif", "price"] },
  { champ: "prix_achat", entete: "Prix d'achat", genre: "montant", synonymes: ["prix d achat", "prix achat", "pa", "cout", "cout d achat", "prix de revient", "cost"] },
  { champ: "quantite", entete: "Quantité en stock", genre: "quantite", synonymes: ["quantite en stock", "quantite", "qte", "qty", "stock", "stock actuel", "en stock"] },
  { champ: "seuil_alerte", entete: "Seuil d'alerte", genre: "quantite", synonymes: ["seuil d alerte", "seuil alerte", "seuil", "alerte", "stock minimum", "stock min", "minimum"] },
  { champ: "actif", entete: "Actif", genre: "booleen", synonymes: ["actif", "active", "statut", "en vente"] },
];

/** Nombre maximal de lignes par import (au-delà : découper le fichier). */
export const MAX_LIGNES_IMPORT = 5000;

/** « Prix d'achat » → « prix d achat » : minuscules, sans accents ni ponctuation. */
export function normaliserEntete(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
}

const texteCellule = (c: Cellule | undefined): string => (c === null || c === undefined ? "" : String(c).trim());
const cleNom = (s: string) => s.trim().toLocaleLowerCase("fr");

// ---------------------------------------------------------------------------
// Export et modèle
// ---------------------------------------------------------------------------

const entetes = () => COLONNES_PRODUITS.map((c) => c.entete);

/** Tableau d'export : une ligne par produit (actifs et inactifs), triée par nom. */
export function tableauExportProduits(
  produits: readonly Produit[], categories: readonly Pick<Categorie, "id" | "nom">[],
): Tableau {
  const nomsCategories = new Map(categories.map((c) => [c.id, c.nom]));
  const lignes = [...produits].sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((p) => COLONNES_PRODUITS.map((col): Cellule => {
    switch (col.champ) {
      case "categorie": return p.categorie_id ? nomsCategories.get(p.categorie_id) ?? null : null;
      case "actif": return p.actif ? "Oui" : "Non";
      case "prix_vente": case "prix_achat": case "quantite": case "seuil_alerte": return Number(p[col.champ]);
      default: return p[col.champ] ?? null;
    }
  }));
  return [entetes(), ...lignes];
}

/** Modèle à remplir : en-têtes et deux lignes d'exemple. */
export function tableauModeleProduits(): Tableau {
  return [
    entetes(),
    ["Riz parfumé 25 kg", "RIZ-25", "6111234567890", "Alimentation", "Sac de 25 kg", "Sac", 17500, 15000, 40, 10, "Oui"],
    ["Huile 1 L", "", "", "Alimentation", "", "Bouteille", 1500, 1200, 120, 24, "Oui"],
  ];
}

/** Nom de fichier daté : « produits-2026-11-14 ». */
export function nomFichierExportProduits(date = new Date()): string {
  const j = (n: number) => String(n).padStart(2, "0");
  return `produits-${date.getFullYear()}-${j(date.getMonth() + 1)}-${j(date.getDate())}`;
}

// ---------------------------------------------------------------------------
// Lecture des valeurs
// ---------------------------------------------------------------------------

/** Nombre d'une cellule : « 1 500 », « 1.250.000 », « 2,5 », « 17 500 FCFA ». undefined si vide, NaN si invalide. */
export function lireNombreCellule(c: Cellule | undefined): number | undefined {
  if (typeof c === "number") return Number.isFinite(c) ? c : NaN;
  let s = texteCellule(c);
  if (!s) return undefined;
  s = s.replace(/f\s?cfa|xof|cfa/gi, "").replace(/[\s  ']/g, "");
  if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, ""); // 1.250.000
  else if (/^-?\d{1,3}(,\d{3}){2,}$/.test(s)) s = s.replace(/,/g, ""); // 1,250,000
  s = s.replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

function lireBooleen(c: Cellule | undefined): boolean | undefined | null {
  const s = normaliserEntete(texteCellule(c));
  if (!s) return undefined;
  if (["oui", "o", "vrai", "true", "1", "x", "actif", "active", "yes", "y"].includes(s)) return true;
  if (["non", "n", "faux", "false", "0", "inactif", "inactive", "no"].includes(s)) return false;
  return null;
}

// ---------------------------------------------------------------------------
// Analyse d'un fichier importé
// ---------------------------------------------------------------------------

/** Valeurs lues sur une ligne : seules les cellules remplies sont présentes (une cellule vide ne modifie rien). */
export interface ValeursImportProduit {
  nom?: string;
  reference?: string;
  code_barres?: string;
  categorie?: string;
  description?: string;
  unite?: string;
  prix_vente?: number;
  prix_achat?: number;
  quantite?: number;
  seuil_alerte?: number;
  actif?: boolean;
}

export interface LigneImportProduit {
  /** Numéro de ligne dans le fichier (comme dans Excel) */
  numero: number;
  action: "creation" | "mise_a_jour";
  /** Produit existant mis à jour */
  produitId: string | null;
  /** Nom affiché dans l'aperçu (nom saisi ou nom du produit existant) */
  libelle: string;
  valeurs: ValeursImportProduit;
  erreurs: string[];
}

export interface AnalyseImportProduits {
  /** Colonnes reconnues : intitulé du fichier → champ */
  colonnes: { entete: string; champ: ChampImportProduit }[];
  /** Intitulés non reconnus (ignorés) */
  colonnesIgnorees: string[];
  lignes: LigneImportProduit[];
  /** Erreur qui empêche tout import (fichier vide, colonne obligatoire absente…) */
  erreur: string | null;
  creations: number;
  misesAJour: number;
  enErreur: number;
}

type ProduitExistant = Pick<Produit, "id" | "nom" | "reference" | "code_barres">;

/**
 * Analyse un tableau importé. La première ligne non vide contient les en-têtes.
 * Correspondance avec un produit existant : par référence, puis code-barres, puis nom
 * (le nom seul ne suffit pas si les deux ont une référence différente, ni s'il est porté par plusieurs produits).
 */
export function analyserImportProduits(tableau: Tableau, existants: readonly ProduitExistant[]): AnalyseImportProduits {
  const analyse: AnalyseImportProduits = {
    colonnes: [], colonnesIgnorees: [], lignes: [], erreur: null, creations: 0, misesAJour: 0, enErreur: 0,
  };
  const iEntete = tableau.findIndex((l) => l.some((c) => texteCellule(c) !== ""));
  if (iEntete < 0) return { ...analyse, erreur: "Le fichier est vide." };

  // Correspondance des colonnes
  const indexChamp = new Map<ChampImportProduit, number>();
  tableau[iEntete].forEach((c, i) => {
    const entete = texteCellule(c);
    if (!entete) return;
    const n = normaliserEntete(entete);
    const col = COLONNES_PRODUITS.find((x) => normaliserEntete(x.entete) === n || x.synonymes.includes(n));
    if (col && !indexChamp.has(col.champ)) {
      indexChamp.set(col.champ, i);
      analyse.colonnes.push({ entete, champ: col.champ });
    } else analyse.colonnesIgnorees.push(entete);
  });
  if (!indexChamp.has("nom") && !indexChamp.has("reference") && !indexChamp.has("code_barres")) {
    return {
      ...analyse,
      erreur: "Colonne « Nom » introuvable : la première ligne du fichier doit contenir les en-têtes (téléchargez le modèle).",
    };
  }
  const donnees = tableau.slice(iEntete + 1).map((l, i) => ({ numero: iEntete + 2 + i, cellules: l }))
    .filter((l) => l.cellules.some((c) => texteCellule(c) !== ""));
  if (!donnees.length) return { ...analyse, erreur: "Aucun produit dans le fichier (seulement la ligne d'en-têtes)." };
  if (donnees.length > MAX_LIGNES_IMPORT) {
    return { ...analyse, erreur: `Trop de lignes (${donnees.length}) : ${MAX_LIGNES_IMPORT} produits au plus par import.` };
  }

  const parReference = new Map(existants.filter((p) => p.reference).map((p) => [p.reference!.trim(), p]));
  const parCodeBarres = new Map(existants.filter((p) => p.code_barres).map((p) => [p.code_barres!.trim(), p]));
  const parNom = new Map<string, ProduitExistant[]>();
  for (const p of existants) parNom.set(cleNom(p.nom), [...(parNom.get(cleNom(p.nom)) ?? []), p]);

  const vus = { references: new Map<string, number>(), codes: new Map<string, number>(), produits: new Map<string, number>() };

  for (const { numero, cellules } of donnees) {
    const erreurs: string[] = [];
    const valeurs: ValeursImportProduit = {};
    for (const col of COLONNES_PRODUITS) {
      const i = indexChamp.get(col.champ);
      if (i === undefined) continue;
      const c = cellules[i];
      if (col.genre === "texte") {
        let s = texteCellule(c);
        if (!s) continue;
        if (col.champ === "nom" || col.champ === "categorie" || col.champ === "unite") s = s.replace(/\s+/g, " ");
        if (col.max && s.length > col.max) erreurs.push(`${col.entete} : ${col.max} caractères au plus`);
        else (valeurs as Record<string, string>)[col.champ] = s;
      } else if (col.genre === "booleen") {
        const b = lireBooleen(c);
        if (b === null) erreurs.push(`${col.entete} : « ${texteCellule(c)} » n'est pas Oui ou Non`);
        else if (b !== undefined) valeurs.actif = b;
      } else {
        const n = lireNombreCellule(c);
        if (n === undefined) continue;
        if (Number.isNaN(n)) { erreurs.push(`${col.entete} : « ${texteCellule(c)} » n'est pas un nombre`); continue; }
        if (n < 0) { erreurs.push(`${col.entete} : valeur négative`); continue; }
        if (col.genre === "montant") {
          const entier = Math.round(n);
          if (Math.abs(n - entier) > 1e-6) erreurs.push(`${col.entete} : montant sans décimales attendu`);
          else if (!Number.isSafeInteger(entier)) erreurs.push(`${col.entete} : montant trop grand`);
          else (valeurs as Record<string, number>)[col.champ] = entier;
        } else {
          const q = Math.round(n * 1000) / 1000;
          if (q >= 1e11) erreurs.push(`${col.entete} : quantité trop grande`);
          else (valeurs as Record<string, number>)[col.champ] = q;
        }
      }
    }

    // Rapprochement avec un produit existant
    let existant: ProduitExistant | undefined;
    if (valeurs.reference) existant = parReference.get(valeurs.reference);
    if (!existant && valeurs.code_barres) existant = parCodeBarres.get(valeurs.code_barres);
    if (!existant && valeurs.nom) {
      const homonymes = (parNom.get(cleNom(valeurs.nom)) ?? [])
        .filter((p) => !valeurs.reference || !p.reference);
      if (homonymes.length > 1) {
        erreurs.push(`Plusieurs produits s'appellent « ${valeurs.nom} » : indiquez leur référence`);
      } else existant = homonymes[0];
    }
    if (!existant && !valeurs.nom) {
      erreurs.push(valeurs.reference || valeurs.code_barres
        ? "Produit introuvable : indiquez son nom pour le créer"
        : "Nom obligatoire");
    }
    // Code-barres déjà porté par un autre produit
    if (valeurs.code_barres) {
      const autre = parCodeBarres.get(valeurs.code_barres);
      if (autre && autre.id !== existant?.id) erreurs.push(`Code-barres déjà utilisé par « ${autre.nom} »`);
    }
    // Doublons dans le fichier
    const doublon = (carte: Map<string, number>, cle: string | undefined, quoi: string) => {
      if (!cle) return;
      const premier = carte.get(cle);
      if (premier !== undefined) erreurs.push(`${quoi} déjà présent ligne ${premier}`);
      else carte.set(cle, numero);
    };
    const avant = erreurs.length;
    doublon(vus.references, valeurs.reference, `Référence « ${valeurs.reference} »`);
    doublon(vus.codes, valeurs.code_barres, `Code-barres « ${valeurs.code_barres} »`);
    if (existant && erreurs.length === avant) doublon(vus.produits, existant.id, `Produit « ${existant.nom} »`);

    const ligne: LigneImportProduit = {
      numero,
      action: existant ? "mise_a_jour" : "creation",
      produitId: existant?.id ?? null,
      libelle: valeurs.nom ?? existant?.nom ?? valeurs.reference ?? valeurs.code_barres ?? "",
      valeurs,
      erreurs,
    };
    analyse.lignes.push(ligne);
    if (erreurs.length) analyse.enErreur++;
    else if (existant) analyse.misesAJour++;
    else analyse.creations++;
  }
  return analyse;
}

/** Ligne envoyée à la RPC `importer_produits` (lignes sans erreur uniquement). */
export interface LigneEnvoiImport extends ValeursImportProduit {
  numero: number;
  produit_id: string | null;
}

export function lignesAEnvoyer(analyse: AnalyseImportProduits): LigneEnvoiImport[] {
  return analyse.lignes.filter((l) => !l.erreurs.length)
    .map((l) => ({ numero: l.numero, produit_id: l.produitId, ...l.valeurs }));
}

/**
 * Lecture et écriture de tableaux simples (une feuille, première ligne = en-têtes) en CSV et en Excel (.xlsx).
 *
 * Le format xlsx est une archive zip de fichiers XML : on l'écrit et on le lit ici avec fflate
 * (décompression zip pure JavaScript, sans dépendance, compatible web et React Native), plutôt
 * qu'avec une grosse bibliothèque de tableur. Seul le contenu des cellules est lu (pas de formules
 * recalculées : on lit la dernière valeur enregistrée par Excel, LibreOffice ou Google Sheets).
 */
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

/** Une cellule : texte, nombre, ou vide. */
export type Cellule = string | number | null;
export type Tableau = Cellule[][];

export type FormatTableur = "csv" | "xlsx";

export const TYPE_MIME_TABLEUR: Record<FormatTableur, string> = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** Séparateur le plus probable d'après la première ligne (hors guillemets) : « ; », « , » ou tabulation. */
function devinerSeparateur(texte: string): string {
  const compte: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  let guillemets = false;
  for (const c of texte) {
    if (c === '"') guillemets = !guillemets;
    else if (!guillemets && (c === "\n" || c === "\r")) break;
    else if (!guillemets && c in compte) compte[c]++;
  }
  const [meilleur, n] = Object.entries(compte).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? meilleur : ";";
}

/**
 * Lit un CSV (RFC 4180 : guillemets, guillemets doublés, retours à la ligne dans les champs).
 * Les lignes vides sont gardées (tableau vide) pour que les numéros de ligne correspondent au fichier.
 */
export function lireCsv(texte: string, separateur?: string): Tableau {
  const t = texte.replace(/^﻿/, "");
  const sep = separateur ?? devinerSeparateur(t);
  const lignes: Tableau = [];
  let ligne: Cellule[] = [];
  let champ = "";
  let guillemets = false;
  const finChamp = () => { ligne.push(champ); champ = ""; };
  const finLigne = () => {
    finChamp();
    lignes.push(ligne.some((c) => String(c).trim() !== "") ? ligne : []);
    ligne = [];
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"') {
        if (t[i + 1] === '"') { champ += '"'; i++; } else guillemets = false;
      } else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) finChamp();
    else if (c === "\n") finLigne();
    else if (c === "\r") { if (t[i + 1] !== "\n") finLigne(); }
    else champ += c;
  }
  if (champ !== "" || ligne.length) finLigne();
  while (lignes.length && lignes[lignes.length - 1].length === 0) lignes.pop();
  return lignes;
}

/**
 * Écrit un CSV pour Excel en français : séparateur « ; », BOM UTF-8 (accents corrects à l'ouverture),
 * nombres décimaux avec une virgule.
 */
export function ecrireCsv(tableau: Tableau): string {
  const champ = (c: Cellule) => {
    if (c === null || c === undefined) return "";
    const s = typeof c === "number" ? String(c).replace(".", ",") : c;
    return /[";\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + tableau.map((l) => l.map(champ).join(";")).join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------

const echapperXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    // Caractères de contrôle interdits en XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function decoderXml(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[e];
  });
}

/** « A » → 0, « AB » → 27 */
function indexColonne(lettres: string): number {
  let n = 0;
  for (const c of lettres) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

function lettresColonne(index: number): string {
  let s = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Texte d'un élément contenant des <t> (chaîne simple ou texte enrichi en plusieurs morceaux). */
function texteDes(xml: string): string {
  let s = "";
  for (const m of xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)) s += m[1];
  return decoderXml(s);
}

/**
 * Écrit un classeur xlsx d'une feuille. Textes en chaînes « inline » (pas de table partagée),
 * première ligne en gras et figée, largeur des colonnes ajustée au contenu.
 */
export function ecrireXlsx(tableau: Tableau, nomFeuille = "Feuille1"): Uint8Array {
  const largeurs: number[] = [];
  const lignesXml = tableau.map((ligne, i) => {
    const cellules = ligne.map((c, j) => {
      const longueur = c === null ? 0 : String(c).length;
      largeurs[j] = Math.max(largeurs[j] ?? 8, Math.min(longueur + 2, 60));
      if (c === null || c === "") return "";
      const ref = `${lettresColonne(j)}${i + 1}`;
      const style = i === 0 ? ' s="1"' : "";
      if (typeof c === "number" && Number.isFinite(c)) return `<c r="${ref}"${style}><v>${c}</v></c>`;
      return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${echapperXml(String(c))}</t></is></c>`;
    }).join("");
    return `<row r="${i + 1}">${cellules}</row>`;
  }).join("");
  const colonnes = largeurs.length
    ? `<cols>${largeurs.map((l, j) => `<col min="${j + 1}" max="${j + 1}" width="${l}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const feuille = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${colonnes}<sheetData>${lignesXml}</sheetData></worksheet>`;
  const nom = echapperXml(nomFeuille.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Feuille1");
  const fichiers: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nom}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": feuille,
  };
  return zipSync(Object.fromEntries(Object.entries(fichiers).map(([k, v]) => [k, strToU8(v)])), { level: 6 });
}

/** Chemin cible d'une relation (« worksheets/sheet1.xml » ou « /xl/worksheets/sheet1.xml ») dans l'archive. */
function cheminRelation(cible: string): string {
  return cible.startsWith("/") ? cible.slice(1) : `xl/${cible.replace(/^\.\//, "")}`;
}

/**
 * Lit la première feuille d'un classeur xlsx (lignes vides gardées comme tableaux vides, pour garder
 * la numérotation d'Excel). Lève une erreur si le fichier n'est pas un xlsx lisible.
 */
export function lireXlsx(contenu: Uint8Array): Tableau {
  let archive: Record<string, Uint8Array>;
  try {
    archive = unzipSync(contenu);
  } catch {
    throw new Error("Fichier Excel illisible : enregistrez-le au format .xlsx (ou .csv) et réessayez.");
  }
  const texte = (chemin: string) => (archive[chemin] ? strFromU8(archive[chemin]) : null);

  // Première feuille du classeur (ordre des onglets), via les relations
  let cheminFeuille = "xl/worksheets/sheet1.xml";
  const classeur = texte("xl/workbook.xml");
  const relations = texte("xl/_rels/workbook.xml.rels");
  const premiere = classeur?.match(/<(?:\w+:)?sheet\b[^>]*?\br:id="([^"]+)"/);
  if (premiere && relations) {
    for (const m of relations.matchAll(/<Relationship\b[^>]*>/g)) {
      if (m[0].includes(`Id="${premiere[1]}"`)) {
        const cible = m[0].match(/Target="([^"]+)"/);
        if (cible) cheminFeuille = cheminRelation(cible[1]);
      }
    }
  }
  const feuille = texte(cheminFeuille);
  if (!feuille) throw new Error("Aucune feuille trouvée dans le fichier Excel.");

  const partagees: string[] = [];
  const sst = texte("xl/sharedStrings.xml");
  if (sst) for (const m of sst.matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)) partagees.push(texteDes(m[1]));

  const tableau: Tableau = [];
  for (const r of feuille.matchAll(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    const numero = Number(r[1].match(/\br="(\d+)"/)?.[1] ?? tableau.length + 1);
    const ligne: Cellule[] = [];
    let colonne = 0;
    for (const c of (r[2] ?? "").matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attributs = c[1];
      const ref = attributs.match(/\br="([A-Z]+)\d*"/);
      if (ref) colonne = indexColonne(ref[1]);
      const type = attributs.match(/\bt="(\w+)"/)?.[1] ?? "n";
      const corps = c[2] ?? "";
      const v = corps.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
      let valeur: Cellule = null;
      if (type === "s" && v !== undefined) valeur = partagees[Number(v)] ?? null;
      else if (type === "inlineStr") valeur = texteDes(corps);
      else if ((type === "str" || type === "e") && v !== undefined) valeur = decoderXml(v);
      else if (type === "b" && v !== undefined) valeur = v === "1" ? "VRAI" : "FAUX";
      else if (v !== undefined && v !== "") {
        const n = Number(v);
        valeur = Number.isFinite(n) ? n : decoderXml(v);
      }
      ligne[colonne] = valeur;
      colonne++;
    }
    for (let i = 0; i < ligne.length; i++) if (ligne[i] === undefined) ligne[i] = null;
    if (ligne.some((x) => x !== null && String(x).trim() !== "")) {
      while (tableau.length < numero - 1) tableau.push([]);
      tableau[numero - 1] = ligne;
    }
  }
  return tableau;
}

/** Format d'après le nom de fichier (.csv, .txt → CSV ; .xlsx → Excel). null si non pris en charge. */
export function formatTableur(nomFichier: string): FormatTableur | null {
  const ext = nomFichier.toLowerCase().split(".").pop();
  if (ext === "csv" || ext === "txt") return "csv";
  if (ext === "xlsx") return "xlsx";
  return null;
}

/** Lit un fichier CSV ou xlsx déjà chargé en mémoire. */
export function lireTableur(nomFichier: string, contenu: Uint8Array): Tableau {
  const format = formatTableur(nomFichier);
  if (format === "xlsx" || (format === null && contenu[0] === 0x50 && contenu[1] === 0x4b)) return lireXlsx(contenu);
  if (format === "csv") return lireCsv(strFromU8(contenu));
  if (nomFichier.toLowerCase().endsWith(".xls")) {
    throw new Error("L'ancien format Excel (.xls) n'est pas pris en charge : enregistrez le fichier en .xlsx ou .csv.");
  }
  throw new Error("Format non pris en charge : choisissez un fichier .xlsx ou .csv.");
}

/** Contenu d'un fichier à écrire. */
export function ecrireTableur(format: FormatTableur, tableau: Tableau, nomFeuille?: string): Uint8Array {
  return format === "xlsx" ? ecrireXlsx(tableau, nomFeuille) : strToU8(ecrireCsv(tableau));
}

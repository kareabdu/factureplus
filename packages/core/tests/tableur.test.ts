// Tests de l'import / export des produits (CSV, Excel). Lancer : pnpm test:core
import assert from "node:assert/strict";
import { test } from "node:test";
import { strToU8, unzipSync, strFromU8, zipSync } from "fflate";

import { ecrireCsv, ecrireXlsx, formatTableur, lireCsv, lireTableur, lireXlsx } from "../src/tableur.ts";
import {
  analyserImportProduits, lignesAEnvoyer, lireNombreCellule, normaliserEntete,
  tableauExportProduits, tableauModeleProduits,
} from "../src/produits-tableur.ts";

test("CSV : lecture (séparateur deviné, guillemets, BOM, lignes vides)", () => {
  assert.deepEqual(lireCsv("﻿Nom;Prix\r\nRiz;1500\r\n\r\n\"Huile; 1 L\";\"dit \"\"fine\"\"\"\r\n"),
    [["Nom", "Prix"], ["Riz", "1500"], [], ["Huile; 1 L", 'dit "fine"']]);
  assert.deepEqual(lireCsv("a,b\n1,\"x\ny\""), [["a", "b"], ["1", "x\ny"]]);
  assert.deepEqual(lireCsv("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
});

test("CSV : écriture pour Excel français, relecture identique", () => {
  const t = [["Nom", "Prix", "Qté"], ["Riz; sac", 1500, 2.5], ["Huile", null, 0]];
  const csv = ecrireCsv(t);
  assert.ok(csv.startsWith("﻿Nom;Prix;Qté\r\n"));
  assert.ok(csv.includes('"Riz; sac";1500;2,5'));
  assert.deepEqual(lireCsv(csv), [["Nom", "Prix", "Qté"], ["Riz; sac", "1500", "2,5"], ["Huile", "", "0"]]);
});

test("XLSX : écriture puis relecture", () => {
  const t = [["Nom", "Prix", "Note"], ["Riz & <sel>", 17500, "é à ç"], [null, 3.25, ""], ["Z", null, null]];
  const contenu = ecrireXlsx(t, "Produits");
  assert.equal(contenu[0], 0x50); // « PK » : archive zip
  assert.deepEqual(lireXlsx(contenu), [["Nom", "Prix", "Note"], ["Riz & <sel>", 17500, "é à ç"], [null, 3.25], ["Z"]]);
  const fichiers = unzipSync(contenu);
  assert.ok(strFromU8(fichiers["xl/workbook.xml"]).includes('name="Produits"'));
});

test("XLSX : chaînes partagées, texte enrichi, cellules éparses (fichier type Excel)", () => {
  const xml = (s: string) => strToU8(`<?xml version="1.0" encoding="UTF-8"?>${s}`);
  const contenu = zipSync({
    "xl/workbook.xml": xml(`<workbook xmlns:r="r"><sheets><sheet name="Stock" sheetId="1" r:id="rId3"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": xml(`<Relationships><Relationship Id="rId3" Type="ws" Target="worksheets/feuille.xml"/></Relationships>`),
    "xl/sharedStrings.xml": xml(`<sst><si><t>Nom</t></si><si><r><t>Ri</t></r><r><rPr/><t xml:space="preserve">z &amp; co</t></r></si></sst>`),
    "xl/worksheets/feuille.xml": xml(`<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="str"><v>Prix</v></c></row>
      <row r="3"><c r="A3" t="s"><v>1</v></c><c r="C3"><v>1500</v></c><c r="D3" t="b"><v>1</v></c></row>
    </sheetData></worksheet>`),
  });
  assert.deepEqual(lireXlsx(contenu), [["Nom", null, "Prix"], [], ["Riz & co", null, 1500, "VRAI"]]);
});

test("format d'après le nom de fichier", () => {
  assert.equal(formatTableur("Stock.XLSX"), "xlsx");
  assert.equal(formatTableur("stock.csv"), "csv");
  assert.equal(formatTableur("stock.pdf"), null);
  assert.throws(() => lireTableur("ancien.xls", new Uint8Array([1, 2])), /\.xls/);
  assert.throws(() => lireXlsx(new Uint8Array([1, 2, 3])), /illisible/);
  assert.deepEqual(lireTableur("a.csv", strToU8("Nom\nRiz")), [["Nom"], ["Riz"]]);
});

test("nombres et en-têtes", () => {
  assert.equal(lireNombreCellule("17 500 FCFA"), 17500);
  assert.equal(lireNombreCellule("1.250.000"), 1250000);
  assert.equal(lireNombreCellule("2,5"), 2.5);
  assert.equal(lireNombreCellule(""), undefined);
  assert.ok(Number.isNaN(lireNombreCellule("douze")));
  assert.equal(normaliserEntete("  Prix d'Achat "), "prix d achat");
  assert.equal(normaliserEntete("Catégorie"), "categorie");
});

const produits = [
  { id: "p1", nom: "Riz", reference: "RIZ-25", code_barres: "611", categorie_id: "c1", description: null, unite: "Sac",
    prix_vente: 17500, prix_achat: 15000, seuil_alerte: 10, quantite: 40, image_url: null, actif: true,
    equipe_id: "e", created_at: "", updated_at: "" },
  { id: "p2", nom: "Huile", reference: null, code_barres: null, categorie_id: null, description: "1 L", unite: "Pcs",
    prix_vente: 1500, prix_achat: 1200, seuil_alerte: 0, quantite: 2.5, image_url: null, actif: false,
    equipe_id: "e", created_at: "", updated_at: "" },
  { id: "p3", nom: "Savon", reference: "SAV-1", code_barres: null, categorie_id: null, description: null, unite: "Pcs",
    prix_vente: 300, prix_achat: 200, seuil_alerte: 0, quantite: 0, image_url: null, actif: true,
    equipe_id: "e", created_at: "", updated_at: "" },
  { id: "p4", nom: "Savon", reference: "SAV-2", code_barres: null, categorie_id: null, description: null, unite: "Pcs",
    prix_vente: 300, prix_achat: 200, seuil_alerte: 0, quantite: 0, image_url: null, actif: true,
    equipe_id: "e", created_at: "", updated_at: "" },
];

test("export : en-têtes, catégorie par nom, tri, réimport sans changement", () => {
  const t = tableauExportProduits(produits, [{ id: "c1", nom: "Alimentation" }]);
  assert.equal(t[0][0], "Nom");
  assert.deepEqual(t[1], ["Huile", null, null, null, "1 L", "Pcs", 1500, 1200, 2.5, 0, "Non"]);
  assert.deepEqual(t[2], ["Riz", "RIZ-25", "611", "Alimentation", null, "Sac", 17500, 15000, 40, 10, "Oui"]);
  // Le fichier exporté se réimporte : chaque ligne retrouve son produit
  const a = analyserImportProduits(lireXlsx(ecrireXlsx(t)), produits);
  assert.equal(a.erreur, null);
  assert.deepEqual(a.lignes.map((l) => [l.action, l.produitId, l.erreurs.length]),
    [["mise_a_jour", "p2", 0], ["mise_a_jour", "p1", 0], ["mise_a_jour", "p3", 0], ["mise_a_jour", "p4", 0]]);
  const viaCsv = analyserImportProduits(lireCsv(ecrireCsv(t)), produits);
  assert.deepEqual(viaCsv.lignes.map((l) => l.valeurs), a.lignes.map((l) => l.valeurs));
});

test("modèle : analysable, deux créations", () => {
  const a = analyserImportProduits(tableauModeleProduits(), []);
  assert.equal(a.erreur, null);
  assert.equal(a.creations, 2);
  assert.equal(a.colonnesIgnorees.length, 0);
});

test("import : synonymes d'en-têtes, valeurs, colonnes inconnues", () => {
  const a = analyserImportProduits([
    [],
    ["Désignation", "PV", "Qté", "Couleur", "Code barre"],
    ["Sucre  en poudre", "1 000", "12,5", "blanc", 3017620422003],
  ], produits);
  assert.deepEqual(a.colonnes.map((c) => c.champ), ["nom", "prix_vente", "quantite", "code_barres"]);
  assert.deepEqual(a.colonnesIgnorees, ["Couleur"]);
  assert.equal(a.lignes[0].numero, 3);
  assert.deepEqual(a.lignes[0].valeurs, { nom: "Sucre en poudre", prix_vente: 1000, quantite: 12.5, code_barres: "3017620422003" });
  assert.equal(a.lignes[0].action, "creation");
});

test("import : correspondance par référence, code-barres, nom", () => {
  const a = analyserImportProduits([
    ["Nom", "Référence", "Code-barres", "Prix de vente"],
    ["Riz nouveau nom", "RIZ-25", "", 18000],   // référence → p1
    ["", "", "611", ""],                         // code-barres → p1 (doublon)
    ["huile", "", "", 1600],                     // nom (casse ignorée) → p2
    ["Savon", "", "", 350],                      // deux « Savon » → ambigu
    ["Savon", "SAV-3", "", 350],                 // référence inconnue : nouveau produit
    ["", "INCONNU", "", 10],                     // introuvable sans nom
  ], produits);
  const l = a.lignes;
  assert.equal(l[0].produitId, "p1");
  assert.deepEqual(l[0].erreurs, []);
  assert.equal(l[1].produitId, "p1");
  assert.match(l[1].erreurs[0], /Produit « Riz » déjà présent ligne 2/);
  assert.equal(l[2].produitId, "p2");
  assert.match(l[3].erreurs[0], /Plusieurs produits/);
  assert.equal(l[4].action, "creation");
  assert.deepEqual(l[4].erreurs, []);
  assert.match(l[5].erreurs[0], /introuvable/);
  assert.deepEqual([a.creations, a.misesAJour, a.enErreur], [1, 2, 3]);
  assert.deepEqual(lignesAEnvoyer(a).map((x) => [x.numero, x.produit_id]), [[2, "p1"], [4, "p2"], [6, null]]);
});

test("import : erreurs de valeurs", () => {
  const a = analyserImportProduits([
    ["Nom", "Prix de vente", "Prix d'achat", "Quantité", "Actif", "Code-barres", "Référence"],
    ["A", "12,5", "-3", "abc", "peut-être", "", ""],
    ["B".repeat(201), "", "", "", "", "611", "SAV-1"],
    ["C", "", "", "1,23456", "non", "999", ""],
    ["D", "", "", "", "", "999", ""],
  ], produits);
  assert.deepEqual(a.lignes[0].erreurs, [
    "Prix de vente : montant sans décimales attendu",
    "Prix d'achat : valeur négative",
    "Quantité en stock : « abc » n'est pas un nombre",
    "Actif : « peut-être » n'est pas Oui ou Non",
  ]);
  assert.ok(a.lignes[1].erreurs.includes("Nom : 200 caractères au plus"));
  assert.ok(a.lignes[1].erreurs.includes("Code-barres déjà utilisé par « Riz »"));
  assert.deepEqual(a.lignes[2].valeurs, { nom: "C", quantite: 1.235, actif: false, code_barres: "999" });
  assert.match(a.lignes[3].erreurs[0], /déjà présent ligne 4/);
});

test("import : fichiers inutilisables", () => {
  assert.equal(analyserImportProduits([], produits).erreur, "Le fichier est vide.");
  assert.match(analyserImportProduits([["Prix", "Stock"], [1, 2]], produits).erreur!, /Nom/);
  assert.match(analyserImportProduits([["Nom"]], produits).erreur!, /Aucun produit/);
  const gros = [["Nom"], ...Array.from({ length: 5001 }, (_, i) => [`P${i}`])];
  assert.match(analyserImportProduits(gros, []).erreur!, /5000/);
});

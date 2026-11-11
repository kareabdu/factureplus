// Tests des règles partagées (sans base). Lancer : pnpm test:core
import assert from "node:assert/strict";
import { test } from "node:test";

import { formaterMontant, formaterQuantite, lireMontant, lireQuantite } from "../src/montants.ts";
import { calculerTotaux } from "../src/taxe.ts";
import { formaterNumero } from "../src/numeros.ts";

test("montants", () => {
  assert.equal(formaterMontant(1250000), "1 250 000 FCFA");
  assert.equal(formaterMontant(1500, null), "1 500");
  assert.equal(lireMontant("1 250 000"), 1250000);
  assert.equal(lireMontant("1.250.000 FCFA"), 1250000);
  assert.equal(lireMontant("12,5"), null);
  assert.equal(lireMontant("-3"), null);
});

test("quantités", () => {
  assert.equal(lireQuantite("2,5"), 2.5);
  assert.equal(lireQuantite("10"), 10);
  assert.equal(lireQuantite("1,2345"), null);
  assert.equal(formaterQuantite(2.5), "2,5");
});

// Mêmes cas que supabase/tests/ventes.test.mjs : le client et la base doivent concorder.
const lignes = [
  { prix_unitaire: 15000, quantite: 2 },
  { prix_unitaire: 7000, quantite: 1, taxable: false },
  { prix_unitaire: 2000, quantite: 1 },
];
const taxe = (t: object) => ({ taxe_type: "total" as const, taxe_nom: "TVA", taxe_taux: 18, taxe_incluse: false, ...t });

test("taxe", () => {
  assert.deepEqual(calculerTotaux(lignes, taxe({ taxe_type: "aucune" })),
    { sous_total: 39000, base_taxable: 32000, montant_taxe: 0, total: 39000 });
  assert.equal(calculerTotaux(lignes, taxe({})).total, 44760);
  assert.deepEqual(calculerTotaux(lignes, taxe({ taxe_incluse: true })),
    { sous_total: 39000, base_taxable: 32000, montant_taxe: 4881, total: 39000 });
  assert.equal(calculerTotaux(lignes, taxe({ taxe_type: "deduction", taxe_taux: 5 })).total, 37400);
});

test("numéros", () => {
  assert.equal(formaterNumero("{PREFIX}{YYYY}-{N:04d}", "FAC-", 2026, 7), "FAC-2026-0007");
  assert.equal(formaterNumero("{PREFIX}{N}", "BL", 2026, 12), "BL12");
});

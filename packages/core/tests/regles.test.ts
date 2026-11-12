// Tests des règles partagées (sans base). Lancer : pnpm test:core
import assert from "node:assert/strict";
import { test } from "node:test";

import { formaterMontant, formaterQuantite, lireMontant, lireQuantite } from "../src/montants.ts";
import { calculerTotaux } from "../src/taxe.ts";
import { formaterNumero } from "../src/numeros.ts";
import { numeroWhatsApp } from "../src/whatsapp.ts";
import { joursDePeriode, libellePeriode, periodePersonnalisee, periodePredefinie } from "../src/periodes.ts";

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

test("périodes prédéfinies (12 novembre 2026)", () => {
  const ref = new Date(2026, 10, 12);
  assert.deepEqual(periodePredefinie("aujourdhui", ref), { code: "aujourdhui", debut: "2026-11-12", fin: "2026-11-12" });
  assert.deepEqual(periodePredefinie("7_jours", ref), { code: "7_jours", debut: "2026-11-06", fin: "2026-11-12" });
  assert.equal(periodePredefinie("30_jours", ref).debut, "2026-10-14");
  assert.deepEqual(periodePredefinie("ce_mois", ref), { code: "ce_mois", debut: "2026-11-01", fin: "2026-11-30" });
  assert.deepEqual(periodePredefinie("mois_dernier", ref), { code: "mois_dernier", debut: "2026-10-01", fin: "2026-10-31" });
  assert.deepEqual(periodePredefinie("mois_dernier", new Date(2026, 0, 15)), { code: "mois_dernier", debut: "2025-12-01", fin: "2025-12-31" });
  assert.deepEqual(periodePredefinie("cette_annee", ref), { code: "cette_annee", debut: "2026-01-01", fin: "2026-12-31" });
  assert.equal(periodePredefinie("annee_derniere", ref).fin, "2025-12-31");
});

test("périodes personnalisées", () => {
  assert.deepEqual(periodePersonnalisee("2026-11-20", "2026-11-01"), { code: "personnalisee", debut: "2026-11-01", fin: "2026-11-20" });
  assert.deepEqual(joursDePeriode({ debut: "2026-02-27", fin: "2026-03-02" }), ["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
  assert.equal(joursDePeriode(periodePredefinie("cette_annee", new Date(2024, 5, 1))).length, 366);
  assert.match(libellePeriode(periodePersonnalisee("2026-11-01", "2026-11-30")), /^1 nov\.? – 30 nov\.? 2026$/);
});

test("numéro WhatsApp international", () => {
  assert.equal(numeroWhatsApp("77 833 97 71", "+221 33 800 00 00"), "221778339771");
  assert.equal(numeroWhatsApp("+221 77 833 97 71", "+225 07 00 00 00"), "221778339771");
  assert.equal(numeroWhatsApp("00221778339771"), "221778339771");
  assert.equal(numeroWhatsApp("0707070707", "+225 27 22 00 00"), "225707070707");
  assert.equal(numeroWhatsApp("221778339771", "+221 33 800 00 00"), "221778339771");
  assert.equal(numeroWhatsApp("778339771"), "778339771");
});

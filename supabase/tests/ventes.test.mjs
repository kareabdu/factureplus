// Tests des ventes : documents, numérotation, taxe, stock, règlements.
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await en(B, "select public.creer_equipe('Bakary Shop')");

const qte = async (id) => Number((await en(null, "select quantite from public.produits where id=$1", [id]))[0].quantite);
const doc = async (id) => (await en(A, "select * from public.documents where id=$1", [id]))[0];
const riz = (await en(A, `select public.creer_produit($1, '{"nom":"Riz","prix_vente":15000}', 10) as id`, [eA]))[0].id;
const huile = (await en(A, `select public.creer_produit($1, '{"nom":"Huile","prix_vente":7000}', 5) as id`, [eA]))[0].id;
const client = (await en(A, "insert into public.clients (equipe_id, nom, telephone) values ($1,'Moussa','770000000') returning id", [eA]))[0].id;

const lignes = (r, h) => JSON.stringify([
  { produit_id: riz, designation: "Riz", prix_unitaire: 15000, quantite: r },
  { produit_id: huile, designation: "Huile", prix_unitaire: 7000, quantite: h, taxable: false },
  { designation: "Livraison", prix_unitaire: 2000, quantite: 1 },
]);

console.log("Brouillon");
const f1 = (await en(A, "select public.enregistrer_document($1,'facture',null,$2,$3) as id",
  [eA, JSON.stringify({ client_id: client }), lignes(2, 1)]))[0].id;
await vrai("totaux sans taxe : 30000 + 7000 + 2000", async () => {
  const d = await doc(f1); return Number(d.total) === 39000 && d.client_nom === "Moussa" && d.numero === null;
});
await vrai("brouillon sans effet sur le stock", async () => (await qte(riz)) === 10);
await echoue("insertion directe de document interdite", () =>
  en(A, "insert into public.documents (equipe_id, type) values ($1,'facture')", [eA]), "permission denied");
await echoue("B ne peut pas modifier le brouillon de A", () =>
  en(B, "select public.enregistrer_document($1,'facture',$2,'{}','[]')", [eA, f1]), "Accès refusé");
await vrai("B ne voit pas les documents de A", async () => (await en(B, "select * from public.documents")).length === 0);

console.log("Taxe");
await en(A, "update public.parametres set taxe_type='total', taxe_taux=18 where equipe_id=$1", [eA]);
await en(A, "select public.enregistrer_document($1,'facture',$2,$3,$4)", [eA, f1, JSON.stringify({ client_id: client }), lignes(2, 1)]);
await vrai("TVA 18 % sur les lignes taxables (32000 → 5760)", async () => {
  const d = await doc(f1); return Number(d.base_taxable) === 32000 && Number(d.montant_taxe) === 5760 && Number(d.total) === 44760;
});
await en(A, "update public.parametres set taxe_incluse=true where equipe_id=$1", [eA]);
await en(A, "select public.enregistrer_document($1,'facture',$2,$3,$4)", [eA, f1, JSON.stringify({ client_id: client }), lignes(2, 1)]);
await vrai("TVA incluse : total inchangé, taxe extraite (4881)", async () => {
  const d = await doc(f1); return Number(d.total) === 39000 && Number(d.montant_taxe) === 4881;
});
await en(A, "update public.parametres set taxe_type='aucune', taxe_incluse=false where equipe_id=$1", [eA]);
await en(A, "select public.enregistrer_document($1,'facture',$2,$3,$4)", [eA, f1, JSON.stringify({ client_id: client }), lignes(2, 1)]);

console.log("Validation");
await vrai("numéro FAC-AAAA-0001", async () => {
  const n = (await en(A, "select public.valider_document($1) as n", [f1]))[0].n;
  return n === `FAC-${new Date().getFullYear()}-0001`;
});
await vrai("stock déduit : riz 10 → 8, huile 5 → 4", async () => (await qte(riz)) === 8 && (await qte(huile)) === 4);
await echoue("facture validée non modifiable", () =>
  en(A, "select public.enregistrer_document($1,'facture',$2,'{}',$3)", [eA, f1, lignes(1, 1)]), "ne peut plus être modifié");
await echoue("facture validée non supprimable", async () => {
  const r = await en(A, "delete from public.documents where id=$1 returning 1", [f1]);
  if (r.length === 0) throw new Error("aucune ligne supprimée");
}, "aucune ligne");
await vrai("resynchronisation idempotente (aucun mouvement de plus)", async () =>
  (await en(null, "select prive.synchroniser_stock_document($1) as n", [f1]))[0].n === 0 && (await qte(riz)) === 8);
await echoue("vente au-delà du stock refusée à la validation", async () => {
  const f = (await en(A, "select public.enregistrer_document($1,'facture',null,'{\"client_nom\":\"X\"}',$2) as id", [eA, lignes(50, 1)]))[0].id;
  await en(A, "select public.valider_document($1)", [f]);
}, "Stock insuffisant");
await vrai("refus de validation : numéro non consommé, stock intact", async () => {
  const f2 = (await en(A, "select public.enregistrer_document($1,'facture',null,'{\"client_nom\":\"Y\"}',$2) as id", [eA, lignes(1, 1)]))[0].id;
  const n = (await en(A, "select public.valider_document($1) as n", [f2]))[0].n;
  return n.endsWith("-0002") && (await qte(riz)) === 7;
});

console.log("Règlements");
await en(A, "select public.enregistrer_reglement($1, 20000, 'wave')", [f1]);
await vrai("paiement partiel : statut émis, payé 20000", async () => {
  const d = await doc(f1); return d.statut === "emis" && Number(d.montant_paye) === 20000;
});
await echoue("trop-perçu refusé", () => en(A, "select public.enregistrer_reglement($1, 20000)", [f1]), "dépasse");
await en(A, "select public.enregistrer_reglement($1, 19000, 'especes')", [f1]);
await vrai("solde : statut payé", async () => (await doc(f1)).statut === "paye");
const reg = (await en(A, "select id from public.reglements where document_id=$1 and montant=19000", [f1]))[0].id;
await en(A, "select public.supprimer_reglement($1)", [reg]);
await vrai("règlement supprimé : retour à émis", async () => {
  const d = await doc(f1); return d.statut === "emis" && Number(d.montant_paye) === 20000;
});

console.log("Bon de livraison");
const bl = (await en(A, "select public.creer_bl($1) as id", [f1]))[0].id;
await vrai("BL numéroté, sans effet sur le stock", async () => {
  const d = await doc(bl); return d.numero.startsWith("BL-") && d.source_id === f1 && (await qte(riz)) === 7;
});

console.log("Annulation");
await en(A, "select public.annuler_document($1)", [f1]);
await vrai("stock réinjecté : riz 7 → 9, huile → 4", async () => (await qte(riz)) === 9 && (await qte(huile)) === 4);
await vrai("annulation idempotente", async () => {
  await en(A, "select public.annuler_document($1)", [f1]); return (await qte(riz)) === 9;
});

console.log("Proforma");
const pro = (await en(A, "select public.enregistrer_document($1,'proforma',null,$2,$3) as id",
  [eA, JSON.stringify({ client_id: client }), lignes(1, 1)]))[0].id;
await en(A, "select public.valider_document($1)", [pro]);
await vrai("proforma validée sans effet sur le stock", async () =>
  (await doc(pro)).numero.startsWith("PRO-") && (await qte(riz)) === 9);
const fp = (await en(A, "select public.convertir_proforma($1) as id", [pro]))[0].id;
await vrai("conversion : facture brouillon reprenant les lignes", async () => {
  const d = await doc(fp); return d.type === "facture" && d.statut === "brouillon" && Number(d.total) === 24000
    && (await doc(pro)).statut === "accepte";
});
await echoue("enregistrer_reglement sur une proforma refusé", () => en(A, "select public.enregistrer_reglement($1, 100)", [pro]), "facture validée");
await vrai("brouillon supprimable", async () =>
  (await en(A, "delete from public.documents where id=$1 returning 1", [fp])).length === 1);

console.log("Tableau de bord");
await vrai("indicateurs cohérents", async () => {
  const r = (await en(A, "select public.resume_tableau_de_bord($1) as r", [eA]))[0].r;
  // Seule la facture n° 2 reste valide (riz 1 + huile 1 + livraison = 24000), payée 0
  return r.nb_produits === 2 && Number(r.ventes_periode) === 24000 && Number(r.impayes) === 24000
    && r.meilleurs_produits.length === 2 && r.ventes_par_jour.length === 1;
});
await echoue("B ne lit pas le tableau de bord de A", () => en(B, "select public.resume_tableau_de_bord($1)", [eA]), "Accès refusé");

process.exit(bilan() ? 1 : 0);

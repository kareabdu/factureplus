// Tests de la modification des documents validés (numéro conservé, stock rapproché, statut payé).
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

const entete = JSON.stringify({ client_nom: "Moussa" });
const lignes = (r, h = 0) => JSON.stringify([
  { produit_id: riz, designation: "Riz", prix_unitaire: 15000, quantite: r },
  ...(h ? [{ produit_id: huile, designation: "Huile", prix_unitaire: 7000, quantite: h }] : []),
]);
const enregistrer = (id, l, e = entete) => en(A, "select public.enregistrer_document($1,'facture',$2,$3,$4) as id", [eA, id, e, l]);

const f = (await enregistrer(null, lignes(2)))[0].id;
const numero = (await en(A, "select public.valider_document($1) as n", [f]))[0].n;

console.log("Facture émise");
await vrai("validation : riz 10 → 8", async () => (await qte(riz)) === 8);
await enregistrer(f, lignes(5, 1));
await vrai("quantité augmentée : riz 8 → 5, huile 5 → 4", async () => (await qte(riz)) === 5 && (await qte(huile)) === 4);
await vrai("numéro conservé, statut émis, total recalculé", async () => {
  const d = await doc(f); return d.numero === numero && d.statut === "emis" && Number(d.total) === 82000;
});
await enregistrer(f, lignes(1));
await vrai("ligne retirée et quantité baissée : riz 5 → 9, huile 4 → 5", async () => (await qte(riz)) === 9 && (await qte(huile)) === 5);
await vrai("deux enregistrements identiques : aucun mouvement de plus", async () => {
  const avant = (await en(null, "select count(*)::int as n from public.mouvements_stock where document_id=$1", [f]))[0].n;
  await enregistrer(f, lignes(1));
  const apres = (await en(null, "select count(*)::int as n from public.mouvements_stock where document_id=$1", [f]))[0].n;
  return avant === apres && (await qte(riz)) === 9;
});
await echoue("stock insuffisant refusé, rien n'est modifié", () => enregistrer(f, lignes(50)), "Stock insuffisant");
await vrai("après le refus : lignes et stock intacts", async () => (await qte(riz)) === 9 && Number((await doc(f)).total) === 15000);
await echoue("au moins une ligne", () => enregistrer(f, "[]"), "au moins une ligne");

console.log("Règlements");
await en(A, "select public.enregistrer_reglement($1, 15000)", [f]);
await vrai("soldée : payée", async () => (await doc(f)).statut === "paye");
await enregistrer(f, lignes(2));
await vrai("total augmenté après paiement : retour à émise, reste 15000", async () => {
  const d = await doc(f); return d.statut === "emis" && Number(d.total) - Number(d.montant_paye) === 15000;
});
await echoue("total sous le montant encaissé refusé", () =>
  enregistrer(f, JSON.stringify([{ produit_id: riz, designation: "Riz", prix_unitaire: 10000, quantite: 1 }])), "déjà encaissé");
await enregistrer(f, lignes(1));
await vrai("total ramené au montant encaissé : payée", async () => (await doc(f)).statut === "paye");

console.log("Taxe figée");
await en(A, "update public.parametres set taxe_type='total', taxe_taux=18 where equipe_id=$1", [eA]);
await enregistrer(f, lignes(1));
await vrai("facture validée : taxe d'origine conservée (aucune)", async () => Number((await doc(f)).montant_taxe) === 0);
await en(A, "update public.parametres set taxe_type='aucune', taxe_taux=0 where equipe_id=$1", [eA]);

console.log("Facture annulée");
await en(A, "select public.annuler_document($1)", [f]);
await vrai("annulation : riz revenu à 10", async () => (await qte(riz)) === 10);
await en(A, "select public.supprimer_reglement(id) from public.reglements where document_id=$1", [f]).catch(() => null);
await enregistrer(f, lignes(3));
await vrai("modifiée après annulation : reste annulée, stock inchangé", async () =>
  (await doc(f)).statut === "annule" && (await qte(riz)) === 10);

console.log("Proforma et isolation");
const p = (await en(A, "select public.enregistrer_document($1,'proforma',null,$2,$3) as id", [eA, entete, lignes(1)]))[0].id;
await en(A, "select public.valider_document($1)", [p]);
await en(A, "select public.enregistrer_document($1,'proforma',$2,$3,$4)", [eA, p, entete, lignes(4)]);
await vrai("proforma validée modifiable, sans effet sur le stock", async () =>
  Number((await doc(p)).total) === 60000 && (await qte(riz)) === 10);
await echoue("B ne peut pas modifier la facture de A", () =>
  en(B, "select public.enregistrer_document($1,'facture',$2,$3,$4)", [eA, f, entete, lignes(1)]), "Accès refusé");

process.exit(bilan() ? 1 : 0);

// Tests des achats : brouillon, réception (entrées de stock), annulation.
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await en(B, "select public.creer_equipe('Bakary Shop')");

const qte = async (id) => Number((await en(null, "select quantite from public.produits where id=$1", [id]))[0].quantite);
const riz = (await en(A, `select public.creer_produit($1, '{"nom":"Riz","prix_achat":12000}', 2) as id`, [eA]))[0].id;
const fourn = (await en(A, "insert into public.fournisseurs (equipe_id, nom) values ($1,'Grossiste Sandaga') returning id", [eA]))[0].id;

console.log("Brouillon");
const ach = (await en(A, "select public.enregistrer_achat($1,null,$2,$3) as id", [eA,
  JSON.stringify({ fournisseur_id: fourn, montant_paye: 50000 }),
  JSON.stringify([{ produit_id: riz, quantite: 5, cout_unitaire: 11500 }])]))[0].id;
await vrai("total 57500, nom du fournisseur repris", async () => {
  const [a] = await en(A, "select * from public.achats where id=$1", [ach]);
  return Number(a.total) === 57500 && a.fournisseur_nom === "Grossiste Sandaga";
});
await vrai("brouillon sans effet sur le stock", async () => (await qte(riz)) === 2);
await vrai("B ne voit pas les achats de A", async () => (await en(B, "select * from public.achats")).length === 0);
await echoue("B ne peut pas réceptionner l'achat de A", () => en(B, "select public.receptionner_achat($1)", [ach]), "Accès refusé");

console.log("Réception");
await vrai("numéro ACH-AAAA-0001", async () =>
  (await en(A, "select public.receptionner_achat($1) as n", [ach]))[0].n === `ACH-${new Date().getFullYear()}-0001`);
await vrai("stock 2 → 7, coût d'achat mis à jour", async () =>
  (await qte(riz)) === 7 && Number((await en(A, "select prix_achat from public.produits where id=$1", [riz]))[0].prix_achat) === 11500);
await echoue("double réception refusée", () => en(A, "select public.receptionner_achat($1)", [ach]), "déjà réceptionné");
await echoue("achat reçu non modifiable", () =>
  en(A, "select public.enregistrer_achat($1,$2,'{}','[]')", [eA, ach]), "ne peut plus être modifié");

console.log("Annulation");
await en(A, "select public.mouvementer_stock($1,'sortie',3)", [riz]);
await echoue("annulation impossible si le stock a été vendu", () => en(A, "select public.annuler_achat($1)", [ach]), "Stock insuffisant");
await vrai("statut inchangé après échec", async () =>
  (await en(A, "select statut from public.achats where id=$1", [ach]))[0].statut === "recu");
await en(A, "select public.mouvementer_stock($1,'entree',3)", [riz]);
await en(A, "select public.annuler_achat($1)", [ach]);
await vrai("annulation : stock 7 → 2", async () => (await qte(riz)) === 2);

process.exit(bilan() ? 1 : 0);

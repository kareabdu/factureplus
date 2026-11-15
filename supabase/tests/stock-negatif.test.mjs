// Tests du stock négatif autorisé (réglage de l'entreprise).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await en(B, "select public.creer_equipe('Bakary Shop')");
const riz = (await en(A, `select public.creer_produit($1, '{"nom":"Riz","prix_vente":15000,"seuil_alerte":2}', 3) as id`, [eA]))[0].id;
const qte = async () => Number((await en(null, "select quantite from public.produits where id=$1", [riz]))[0].quantite);
const lignes = (q) => JSON.stringify([{ produit_id: riz, designation: "Riz", prix_unitaire: 15000, quantite: q }]);

console.log("Autorisé (par défaut)");
await vrai("réglage activé par défaut", async () =>
  (await en(A, "select autoriser_stock_negatif from public.parametres where equipe_id=$1", [eA]))[0].autoriser_stock_negatif === true);
await vrai("sortie au-delà du stock : 3 → −2", async () => {
  await en(A, "select public.mouvementer_stock($1,'sortie',5)", [riz]);
  return (await qte()) === -2;
});
await vrai("mouvement tracé avec une quantité après négative", async () =>
  Number((await en(A, "select quantite_apres from public.mouvements_stock where produit_id=$1 order by id desc limit 1", [riz]))[0].quantite_apres) === -2);
await vrai("alerte de stock active en négatif", async () =>
  (await en(A, "select 1 from public.alertes_stock where produit_id=$1 and statut='active'", [riz])).length === 1);
await vrai("facture validée au-delà du stock : −2 → −6", async () => {
  const f = (await en(A, "select public.enregistrer_document($1,'facture',null,'{\"client_nom\":\"Moussa\"}',$2) as id", [eA, lignes(4)]))[0].id;
  await en(A, "select public.valider_document($1)", [f]);
  return (await qte()) === -6;
});
await vrai("entrée de 10 : −6 → 4", async () => { await en(A, "select public.mouvementer_stock($1,'entree',10)", [riz]); return (await qte()) === 4; });
await echoue("ajustement à une quantité négative refusé", () => en(A, "select public.mouvementer_stock($1,'ajustement',-1)", [riz]), "Quantité invalide");

console.log("Désactivé");
await en(A, "update public.parametres set autoriser_stock_negatif=false where equipe_id=$1", [eA]);
await echoue("sortie au-delà du stock refusée", () => en(A, "select public.mouvementer_stock($1,'sortie',5)", [riz]), "Stock insuffisant");
await vrai("stock intact après refus", async () => (await qte()) === 4);
await vrai("B ne change pas le réglage de A", async () =>
  (await en(B, "update public.parametres set autoriser_stock_negatif=true where equipe_id=$1 returning 1", [eA])).length === 0);

process.exit(bilan() ? 1 : 0);

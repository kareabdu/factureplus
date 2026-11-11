// Tests du stock : produits, mouvements, alertes, inventaires.
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
const eB = (await en(B, "select public.creer_equipe('Bakary Shop') as id"))[0].id;

const qte = async (id) => Number((await en(null, "select quantite from public.produits where id=$1", [id]))[0].quantite);

console.log("Produits");
const riz = (await en(A, `select public.creer_produit($1, '{"nom":"Riz 25 kg","prix_vente":15000,"prix_achat":12000,"seuil_alerte":5,"code_barres":"6111"}', 20) as id`, [eA]))[0].id;
await vrai("stock initial = 20 avec un mouvement", async () =>
  (await qte(riz)) === 20 && (await en(A, "select * from public.mouvements_stock where produit_id=$1", [riz])).length === 1);
await vrai("référence automatique P-0001", async () =>
  (await en(A, "select reference from public.produits where id=$1", [riz]))[0].reference === "P-0001");
await echoue("code-barres dupliqué refusé", () =>
  en(A, `select public.creer_produit($1, '{"nom":"Autre","code_barres":"6111"}')`, [eA]), "duplicate");
await echoue("quantité non modifiable directement", () =>
  en(A, "update public.produits set quantite=999 where id=$1", [riz]), "permission denied");
await echoue("insertion directe interdite (passer par creer_produit)", () =>
  en(A, "insert into public.produits (equipe_id, nom) values ($1,'X')", [eA]), "permission denied");
await vrai("prix modifiable directement", async () =>
  (await en(A, "update public.produits set prix_vente=16000 where id=$1 returning 1", [riz])).length === 1);

console.log("Isolation");
await vrai("B ne voit pas les produits de A", async () => (await en(B, "select * from public.produits")).length === 0);
await echoue("B ne peut pas mouvementer le stock de A", () =>
  en(B, "select public.mouvementer_stock($1,'sortie',1)", [riz]), "Accès refusé");
await echoue("B ne peut pas créer de produit chez A", () =>
  en(B, `select public.creer_produit($1, '{"nom":"Pirate"}')`, [eA]), "Accès refusé");
await vrai("B ne voit pas les mouvements de A", async () => (await en(B, "select * from public.mouvements_stock")).length === 0);
await echoue("B ne peut pas créer de catégorie chez A", () =>
  en(B, "insert into public.categories (equipe_id, nom) values ($1,'X')", [eA]), "row-level security");

console.log("Mouvements");
await en(A, "select public.mouvementer_stock($1,'sortie',4,'Casse')", [riz]);
await vrai("sortie : 20 → 16", async () => (await qte(riz)) === 16);
await echoue("stock négatif refusé", () => en(A, "select public.mouvementer_stock($1,'sortie',17)", [riz]), "Stock insuffisant");
await vrai("stock inchangé après refus", async () => (await qte(riz)) === 16);
await en(A, "select public.mouvementer_stock($1,'ajustement',10)", [riz]);
await vrai("ajustement à 10, variation −6 tracée", async () => {
  const [m] = await en(A, "select variation, quantite_avant, quantite_apres from public.mouvements_stock where produit_id=$1 order by id desc limit 1", [riz]);
  return (await qte(riz)) === 10 && Number(m.variation) === -6 && Number(m.quantite_avant) === 16;
});
await echoue("quantité nulle refusée", () => en(A, "select public.mouvementer_stock($1,'entree',0)", [riz]), "Quantité invalide");
await echoue("mouvements inaltérables", () => en(A, "delete from public.mouvements_stock where produit_id=$1", [riz]), "permission denied");

console.log("Alertes");
await en(A, "select public.mouvementer_stock($1,'sortie',6)", [riz]);
await vrai("stock 4 ≤ seuil 5 : alerte active", async () =>
  (await en(A, "select * from public.alertes_stock where produit_id=$1 and statut='active'", [riz])).length === 1);
await en(A, "select public.mouvementer_stock($1,'sortie',1)", [riz]);
await vrai("une seule alerte active, quantité à jour", async () => {
  const r = await en(A, "select quantite from public.alertes_stock where produit_id=$1 and statut='active'", [riz]);
  return r.length === 1 && Number(r[0].quantite) === 3;
});
await en(A, "select public.mouvementer_stock($1,'entree',10)", [riz]);
await vrai("réappro : alerte résolue", async () =>
  (await en(A, "select * from public.alertes_stock where produit_id=$1 and statut='active'", [riz])).length === 0);
await en(A, "update public.produits set seuil_alerte=50 where id=$1", [riz]);
await vrai("seuil relevé sur la fiche : alerte recréée", async () =>
  (await en(A, "select * from public.alertes_stock where produit_id=$1 and statut='active'", [riz])).length === 1);
await en(A, "update public.produits set seuil_alerte=5 where id=$1", [riz]);

console.log("Inventaire");
const huile = (await en(A, `select public.creer_produit($1, '{"nom":"Huile 5 L"}', 8) as id`, [eA]))[0].id;
const inv = (await en(A, "select public.creer_inventaire($1) as id", [eA]))[0].id;
await vrai("lignes avec stock théorique", async () =>
  (await en(A, "select * from public.inventaire_lignes where inventaire_id=$1", [inv])).length === 2);
await en(A, "update public.inventaire_lignes set quantite_comptee=11 where inventaire_id=$1 and produit_id=$2", [inv, riz]);
await en(A, "update public.inventaire_lignes set quantite_comptee=8 where inventaire_id=$1 and produit_id=$2", [inv, huile]);
await echoue("B ne peut pas clôturer l'inventaire de A", () => en(B, "select public.cloturer_inventaire($1)", [inv]), "Accès refusé");
await vrai("clôture : 1 écart (riz 13 → 11)", async () =>
  (await en(A, "select public.cloturer_inventaire($1) as n", [inv]))[0].n === 1 && (await qte(riz)) === 11 && (await qte(huile)) === 8);
await echoue("double clôture refusée", () => en(A, "select public.cloturer_inventaire($1)", [inv]), "déjà clôturé");
await vrai("comptage figé après clôture", async () =>
  (await en(A, "update public.inventaire_lignes set quantite_comptee=0 where inventaire_id=$1 returning 1", [inv])).length === 0);

console.log("Suppression");
await echoue("produit avec historique non supprimable", () => en(A, "delete from public.produits where id=$1", [riz]), "foreign key");
await vrai("désactivation possible", async () =>
  (await en(A, "update public.produits set actif=false where id=$1 returning 1", [riz])).length === 1);
void eB;

process.exit(bilan() ? 1 : 0);

// Tests de la suppression du compte par l'utilisateur (exigence App Store).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

/** Équipe complète : produit, mouvements, client, facture validée et réglée, achat, inventaire, dépense. */
async function equipeComplete(u, nom) {
  const e = (await en(u, "select public.creer_equipe($1) as id", [nom]))[0].id;
  const riz = (await en(u, `select public.creer_produit($1, '{"nom":"Riz","prix_vente":15000,"prix_achat":12000}', 10) as id`, [e]))[0].id;
  await en(u, "select public.mouvementer_stock($1,'entree',5)", [riz]);
  const client = (await en(u, "insert into public.clients (equipe_id, nom) values ($1,'Moussa') returning id", [e]))[0].id;
  const f = (await en(u, "select public.enregistrer_document($1,'facture',null,$2,$3) as id", [e,
    JSON.stringify({ client_id: client }),
    JSON.stringify([{ produit_id: riz, designation: "Riz", prix_unitaire: 15000, quantite: 2 }])]))[0].id;
  await en(u, "select public.valider_document($1)", [f]);
  await en(u, "select public.enregistrer_reglement($1, 10000, 'wave')", [f]);
  const fourn = (await en(u, "insert into public.fournisseurs (equipe_id, nom) values ($1,'Grossiste') returning id", [e]))[0].id;
  await en(u, "select public.enregistrer_achat($1,null,$2,$3)", [e,
    JSON.stringify({ fournisseur_id: fourn, montant_paye: 0 }),
    JSON.stringify([{ produit_id: riz, quantite: 3, cout_unitaire: 11500 }])]);
  await en(u, "select public.creer_inventaire($1)", [e]);
  await en(u, `insert into public.depenses (equipe_id, commercant, montant, categorie, moyen_paiement, date_depense)
    values ($1,'Senelec',25000,'facture','wave','2026-11-05')`, [e]);
  return e;
}

const TABLES = ["produits", "mouvements_stock", "clients", "documents", "document_lignes", "reglements",
  "fournisseurs", "achats", "achat_lignes", "inventaires", "depenses", "parametres", "membres_equipe"];
const lignesEquipe = async (e) => {
  let n = 0;
  for (const t of TABLES) n += Number((await en(null, `select count(*) as n from public.${t} where equipe_id=$1`, [e]))[0].n);
  return n;
};

const A = await creerUser("awa@exemple.sn", "Awa Diop");
const B = await creerUser("bakary@exemple.sn", "Bakary");
const eA = await equipeComplete(A, "Diop Commerce");
const eB = await equipeComplete(B, "Bakary Shop");
const avantB = await lignesEquipe(eB);

console.log("Suppression");
await echoue("sans connexion : refusé", () => en(null, "select public.supprimer_mon_compte()"), "Connectez-vous");
await vrai("A a bien des données avant", async () => (await lignesEquipe(eA)) > 10);
await en(A, "select public.supprimer_mon_compte()");
await vrai("compte de A supprimé", async () =>
  (await en(null, "select count(*) as n from auth.users where id=$1", [A.id]))[0].n == 0);
await vrai("profil de A supprimé", async () =>
  (await en(null, "select count(*) as n from public.profils where id=$1", [A.id]))[0].n == 0);
await vrai("équipe de A supprimée", async () =>
  (await en(null, "select count(*) as n from public.equipes where id=$1", [eA]))[0].n == 0);
await vrai("toutes les données de A supprimées", async () => (await lignesEquipe(eA)) === 0);
await vrai("données de B intactes", async () => (await lignesEquipe(eB)) === avantB);

console.log("Compte expiré (lecture seule)");
await en(null, "update public.profils set essai_fin = now() - interval '1 day', abonnement_fin = null where id=$1", [B.id]);
await vrai("B est en lecture seule", async () =>
  (await en(null, "select prive.etat_abonnement($1) as e", [B.id]))[0].e === "expire");
await echoue("B ne peut plus modifier ses données", () =>
  en(B, "insert into public.clients (equipe_id, nom) values ($1,'Nouveau')", [eB]), "Abonnement expiré");
await en(B, "select public.supprimer_mon_compte()");
await vrai("B a pu supprimer son compte malgré l'expiration", async () =>
  (await en(null, "select count(*) as n from auth.users where id=$1", [B.id]))[0].n == 0 && (await lignesEquipe(eB)) === 0);
await vrai("le contrôle d'abonnement reste actif ensuite", async () => {
  const C = await creerUser("cheikh@exemple.sn");
  const eC = (await en(C, "select public.creer_equipe('Cheikh') as id"))[0].id;
  await en(null, "update public.profils set essai_fin = now() - interval '1 day', abonnement_fin = null where id=$1", [C.id]);
  try { await en(C, "insert into public.clients (equipe_id, nom) values ($1,'X')", [eC]); return false; }
  catch (e) { return e.message.includes("Abonnement expiré"); }
});

process.exit(bilan() ? 1 : 0);

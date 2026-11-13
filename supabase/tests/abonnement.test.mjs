// Tests de l'abonnement : état d'accès, blocage des écritures à l'expiration,
// confirmation des paiements (rôle service) et administration de la plateforme.
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { db, en, vrai, echoue, creerUser, bilan } = await creerBase();

/** Exécute une requête avec le rôle service (fonctions Edge). */
async function service(sql, params = []) {
  await db.exec("reset role; select set_config('request.jwt.claims', '', false); set role service_role");
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const C = await creerUser("admin@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
const eB = (await en(B, "select public.creer_equipe('Bakary Shop') as id"))[0].id;
const eC = (await en(C, "select public.creer_equipe('Plateforme') as id"))[0].id;

const etat = async (u) => (await en(null, "select prive.etat_abonnement($1) as e", [u.id]))[0].e;
const profil = async (u) => (await en(u, "select * from public.profils where id=$1", [u.id]))[0];
const ajouterClient = (u, equipe, nom = "Moussa") =>
  en(u, "insert into public.clients (equipe_id, nom) values ($1, $2) returning id", [equipe, nom]);
const expirerEssai = (u) => en(null, "update public.profils set essai_fin = now() - interval '1 day' where id=$1", [u.id]);

console.log("Tarifs");
await vrai("mensuel 2 900 FCFA / 30 jours, annuel 29 000 FCFA / 365 jours", async () => {
  const t = await en(A, "select * from public.tarifs_abonnement() order by montant");
  return t.length === 2 && t[0].plan === "mensuel" && Number(t[0].montant) === 2900 && t[0].duree_jours === 30
    && t[1].plan === "annuel" && Number(t[1].montant) === 29000 && t[1].duree_jours === 365;
});

console.log("Essai et expiration");
await vrai("nouvel inscrit en essai (7 jours)", async () => (await etat(A)) === "essai");
const client = (await ajouterClient(A, eA))[0].id;
const produit = (await en(A, `select public.creer_produit($1, '{"nom":"Riz","prix_vente":15000}', 10) as id`, [eA]))[0].id;
await expirerEssai(A);
await vrai("essai dépassé : état expiré", async () => (await etat(A)) === "expire");
await echoue("expiré : ajout de client refusé", () => ajouterClient(A, eA, "Fatou"), "Abonnement expiré");
await echoue("expiré : modification de produit refusée", () =>
  en(A, "update public.produits set prix_vente = 1 where id=$1", [produit]), "Abonnement expiré");
await echoue("expiré : suppression de client refusée", () =>
  en(A, "delete from public.clients where id=$1", [client]), "Abonnement expiré");
await echoue("expiré : création de produit par RPC refusée", () =>
  en(A, `select public.creer_produit($1, '{"nom":"Huile","prix_vente":7000}', 5)`, [eA]), "Abonnement expiré");
await echoue("expiré : facture refusée", () =>
  en(A, "select public.enregistrer_document($1,'facture',null,'{}',$2)",
    [eA, JSON.stringify([{ designation: "Service", prix_unitaire: 1000, quantite: 1 }])]), "Abonnement expiré");
await echoue("expiré : dépense refusée", () =>
  en(A, "insert into public.depenses (equipe_id, commercant, montant) values ($1, 'Loyer', 50000)", [eA]), "Abonnement expiré");
await echoue("expiré : paramètres non modifiables", () =>
  en(A, "update public.parametres set telephone='770000000' where equipe_id=$1", [eA]), "Abonnement expiré");
await vrai("expiré : lecture toujours possible", async () =>
  (await en(A, "select * from public.clients")).length === 1 && (await en(A, "select * from public.produits")).length === 1);
await vrai("expiré : le profil reste modifiable", async () =>
  (await en(A, "update public.profils set nom_complet='Awa Diop' where id=$1 returning 1", [A.id])).length === 1);
await vrai("l'équipe de B (en essai) n'est pas touchée", async () => (await ajouterClient(B, eB)).length === 1);

console.log("Paiement Unitech Pay");
const p1 = (await service(
  `insert into public.paiements_abonnement (utilisateur_id, plan, montant, moyen, reference)
   values ($1, 'mensuel', 2900, 'wave', 'REF-1') returning id`, [A.id]))[0].id;
await vrai("A voit son paiement en attente", async () => {
  const p = await en(A, "select * from public.paiements_abonnement");
  return p.length === 1 && p[0].statut === "en_attente";
});
await vrai("B ne voit pas le paiement de A", async () => (await en(B, "select * from public.paiements_abonnement")).length === 0);
await echoue("A ne crée pas de paiement lui-même", () =>
  en(A, "insert into public.paiements_abonnement (utilisateur_id, plan, montant, moyen) values ($1,'annuel',1,'wave')", [A.id]),
  "permission denied");
await echoue("A ne confirme pas son paiement lui-même", () =>
  en(A, "select public.activer_paiement_abonnement($1, 2900)", [p1]), "permission denied");
await echoue("A ne s'active pas en modifiant son profil", () =>
  en(A, "update public.profils set abonnement_statut='actif', abonnement_fin='2030-01-01' where id=$1", [A.id]), "permission denied");
await echoue("montant reçu insuffisant refusé", () =>
  service("select public.activer_paiement_abonnement($1, 2000)", [p1]), "inférieur au montant attendu");
await vrai("paiement confirmé : abonnement mensuel jusqu'à J+30", async () => {
  const r = (await service("select public.activer_paiement_abonnement($1, 2900, 'TX-1') as ok", [p1]))[0].ok;
  const ok = (await en(null, "select abonnement_fin = current_date + 30 as ok from public.profils where id=$1", [A.id]))[0].ok;
  const p = (await en(A, "select * from public.paiements_abonnement where id=$1", [p1]))[0];
  return r === true && ok && (await etat(A)) === "actif" && p.statut === "paye" && p.transaction_id === "TX-1";
});
await vrai("confirmation répétée (webhook + vérification) sans effet", async () =>
  (await service("select public.activer_paiement_abonnement($1, 2900) as ok", [p1]))[0].ok === false
  && (await en(null, "select abonnement_fin = current_date + 30 as ok from public.profils where id=$1", [A.id]))[0].ok);
await vrai("abonné : les écritures reprennent", async () => (await ajouterClient(A, eA, "Fatou")).length === 1);
await vrai("renouvellement annuel ajouté à la fin en cours (J+30+365)", async () => {
  const p2 = (await service(
    `insert into public.paiements_abonnement (utilisateur_id, plan, montant, moyen, reference)
     values ($1, 'annuel', 29000, 'orange_maxit', 'REF-2') returning id`, [A.id]))[0].id;
  await service("select public.activer_paiement_abonnement($1, 29000)", [p2]);
  const p = await profil(A);
  const ok = (await en(null, "select abonnement_fin = current_date + 395 as ok from public.profils where id=$1", [A.id]))[0].ok;
  return ok && p.abonnement_plan === "annuel";
});
await vrai("paiement abandonné marqué échoué", async () => {
  const p3 = (await service(
    `insert into public.paiements_abonnement (utilisateur_id, plan, montant, moyen) values ($1, 'mensuel', 2900, 'wave') returning id`,
    [B.id]))[0].id;
  await service("select public.marquer_paiement_abonnement($1, 'echoue')", [p3]);
  return (await en(B, "select statut from public.paiements_abonnement where id=$1", [p3]))[0].statut === "echoue";
});
await vrai("abonnement arrivé à échéance : expiré", async () => {
  await en(null, "update public.profils set abonnement_fin = current_date - 1 where id=$1", [A.id]);
  const e = await etat(A);
  await en(null, "update public.profils set abonnement_fin = current_date + 395 where id=$1", [A.id]);
  return e === "expire";
});

console.log("Administration");
await echoue("un utilisateur ordinaire n'accède pas à l'administration", () =>
  en(A, "select public.admin_statistiques()"), "Réservé aux administrateurs");
await echoue("ni à la liste des utilisateurs", () => en(B, "select * from public.admin_utilisateurs()"), "Réservé aux administrateurs");
await vrai("suis_admin_plateforme faux pour A", async () =>
  (await en(A, "select public.suis_admin_plateforme() as a"))[0].a === false);
await echoue("A ne se déclare pas administrateur", () =>
  en(A, "insert into public.administrateurs_plateforme (utilisateur_id) values ($1)", [A.id]), "permission denied");
await en(null, "insert into public.administrateurs_plateforme (utilisateur_id) values ($1)", [C.id]);
await vrai("C est administrateur", async () => (await en(C, "select public.suis_admin_plateforme() as a"))[0].a === true);
await vrai("administrateur : accès permanent, même essai dépassé", async () => {
  await expirerEssai(C);
  return (await etat(C)) === "admin" && (await ajouterClient(C, eC)).length === 1;
});
await vrai("statistiques : 3 comptes, 1 abonné, 1 en essai", async () => {
  const s = (await en(C, "select public.admin_statistiques() as s"))[0].s;
  return s.utilisateurs === 3 && s.abonnes === 1 && s.en_essai === 1 && Number(s.revenus_total) === 31900;
});
await vrai("liste des utilisateurs avec état et entreprise", async () => {
  const u = await en(C, "select * from public.admin_utilisateurs()");
  const a = u.find((x) => x.id === A.id);
  return u.length === 3 && a.etat === "actif" && a.entreprise === "Diop Commerce";
});
await vrai("recherche par entreprise", async () => {
  const u = await en(C, "select * from public.admin_utilisateurs('bakary shop')");
  return u.length === 1 && u[0].id === B.id;
});
await vrai("l'administrateur voit tous les paiements", async () =>
  (await en(C, "select * from public.admin_paiements()")).length === 3
  && (await en(C, "select * from public.paiements_abonnement")).length === 3);
await vrai("arrêt de l'accès de B : lecture seule", async () => {
  await en(C, "select public.admin_definir_abonnement($1, null)", [B.id]);
  return (await etat(B)) === "expire";
});
await echoue("B expiré ne crée plus de client", () => ajouterClient(B, eB, "Ndeye"), "Abonnement expiré");
await vrai("activation manuelle de B (paiement en espèces enregistré)", async () => {
  await en(C, "select public.admin_definir_abonnement($1, 'annuel', current_date + 10, 29000)", [B.id]);
  const paiements = await en(B, "select * from public.paiements_abonnement where moyen='manuel'");
  return (await etat(B)) === "actif" && paiements.length === 1 && paiements[0].statut === "paye";
});
await echoue("date de fin passée refusée", () =>
  en(C, "select public.admin_definir_abonnement($1, 'mensuel', current_date - 1)", [B.id]), "aujourd'hui ou plus tard");
await vrai("prolongation de l'essai de A expiré", async () => {
  await en(null, "update public.profils set abonnement_statut='expire', abonnement_fin=null where id=$1", [A.id]);
  await en(C, "select public.admin_prolonger_essai($1, 14)", [A.id]);
  return (await etat(A)) === "essai";
});
await echoue("A ne prolonge pas son propre essai", () =>
  en(A, "select public.admin_prolonger_essai($1, 30)", [A.id]), "Réservé aux administrateurs");

process.exit(bilan() ? 1 : 0);

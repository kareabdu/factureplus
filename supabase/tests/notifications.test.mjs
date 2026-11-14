// Tests des notifications push de stock bas / rupture (jetons, file d'envoi, absence de doublons).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
const eB = (await en(B, "select public.creer_equipe('Bakary Shop') as id"))[0].id;
const jetonA = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const jetonB = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]";

const file = async (equipe = eA) =>
  en(null, "select niveau, titre, corps from public.notifications_push where equipe_id=$1 order by id", [equipe]);
const sortie = (u, id, q) => en(u, "select public.mouvementer_stock($1,'sortie',$2)", [id, q]);
const entree = (u, id, q) => en(u, "select public.mouvementer_stock($1,'entree',$2)", [id, q]);
const nbJetons = async (jeton) =>
  (await en(null, "select count(*)::int as n from public.appareils_push where jeton=$1", [jeton]))[0].n;

console.log("Appareils");
await vrai("sans appareil : alerte créée mais rien dans la file", async () => {
  const p = (await en(A, `select public.creer_produit($1, '{"nom":"Sel","seuil_alerte":5}', 3) as id`, [eA]))[0].id;
  const al = await en(A, "select niveau_notifie from public.alertes_stock where produit_id=$1 and statut='active'", [p]);
  return al.length === 1 && al[0].niveau_notifie === "bas" && (await file()).length === 0;
});
await en(A, "select public.enregistrer_appareil_push($1, 'ios')", [jetonA]);
await vrai("jeton enregistré, visible par son propriétaire seulement", async () =>
  (await en(A, "select jeton from public.appareils_push")).length === 1
  && (await en(B, "select jeton from public.appareils_push")).length === 0);
await vrai("réenregistrement idempotent", async () => {
  await en(A, "select public.enregistrer_appareil_push($1, 'ios')", [jetonA]);
  return (await nbJetons(jetonA)) === 1;
});
await echoue("jeton mal formé refusé", () =>
  en(A, "select public.enregistrer_appareil_push('jeton-invalide', 'ios')"), "check");
await echoue("plateforme inconnue refusée", () =>
  en(A, "select public.enregistrer_appareil_push($1, 'web')", [jetonB]), "check");
await echoue("sans connexion : refusé", () =>
  en(null, "select public.enregistrer_appareil_push($1, 'ios')", [jetonB]), "Connectez-vous");
await echoue("écriture directe interdite", () =>
  en(A, "insert into public.appareils_push (jeton, user_id, plateforme) values ($1,$2,'ios')", [jetonB, A.id]),
  "permission denied");
await echoue("file d'envoi illisible pour les membres", () => en(A, "select * from public.notifications_push"), "permission denied");
await echoue("réservation réservée au rôle service", () =>
  en(A, "select * from public.reserver_notifications_push()"), "permission denied");

console.log("Stock bas puis rupture, sans doublons");
const riz = (await en(A, `select public.creer_produit($1, '{"nom":"Riz","seuil_alerte":10,"unite":"Sac"}', 20) as id`, [eA]))[0].id;
await vrai("au-dessus du seuil : rien", async () => (await file()).length === 0);
await sortie(A, riz, 12);
await vrai("passage sous le seuil : une notification « Stock bas »", async () => {
  const f = await file();
  return f.length === 1 && f[0].niveau === "bas" && f[0].titre === "Stock bas"
    && f[0].corps === "Riz : plus que 8 Sac en stock (seuil 10).";
});
await sortie(A, riz, 3);
await sortie(A, riz, 2.5);
await vrai("baisse supplémentaire : pas de nouvelle notification", async () => (await file()).length === 1);
await sortie(A, riz, 2.5);
await vrai("rupture : une notification « Rupture de stock »", async () => {
  const f = await file();
  return f.length === 2 && f[1].niveau === "rupture" && f[1].titre === "Rupture de stock" && f[1].corps === "Riz : stock épuisé.";
});
await entree(A, riz, 2);
await sortie(A, riz, 2);
await vrai("remonte puis retombe sans quitter l'alerte : pas de doublon", async () => (await file()).length === 2);
await entree(A, riz, 50);
await vrai("réapprovisionné : alerte résolue", async () =>
  (await en(A, "select * from public.alertes_stock where produit_id=$1 and statut='active'", [riz])).length === 0);
await sortie(A, riz, 45);
await vrai("nouvelle baisse après résolution : notifiée de nouveau", async () => {
  const f = await file();
  return f.length === 3 && f[2].niveau === "bas";
});
await vrai("seuil relevé sur la fiche : notifié", async () => {
  const savon = (await en(A, `select public.creer_produit($1, '{"nom":"Savon"}', 4) as id`, [eA]))[0].id;
  await en(A, "update public.produits set seuil_alerte = 5 where id=$1", [savon]);
  const f = await file();
  return f.length === 4 && f[3].corps.startsWith("Savon");
});
await vrai("autre équipe sans appareil : rien", async () => {
  const p = (await en(B, `select public.creer_produit($1, '{"nom":"Thé","seuil_alerte":5}', 6) as id`, [eB]))[0].id;
  await sortie(B, p, 6);
  return (await file(eB)).length === 0;
});

console.log("Envoi (rôle service)");
await en(B, "select public.enregistrer_appareil_push($1, 'android')", [jetonB]);
await vrai("réservation : notifications de A avec le jeton de A seulement", async () => {
  const r = await en(null, "select * from public.reserver_notifications_push(10)");
  return r.length === 4 && r.every((x) => x.jetons.length === 1 && x.jetons[0] === jetonA) && r[0].produit_id === riz;
});
await vrai("déjà réservées : pas renvoyées", async () =>
  (await en(null, "select * from public.reserver_notifications_push(10)")).length === 0);

console.log("Retrait et suppression");
await vrai("B ne retire pas le jeton de A", async () => {
  await en(B, "select public.retirer_appareil_push($1)", [jetonA]);
  return (await nbJetons(jetonA)) === 1;
});
await vrai("le jeton passe au compte qui se connecte sur l'appareil", async () => {
  await en(B, "select public.enregistrer_appareil_push($1, 'ios')", [jetonA]);
  return (await en(null, "select user_id from public.appareils_push where jeton=$1", [jetonA]))[0].user_id === B.id;
});
await vrai("retrait par son propriétaire", async () => {
  await en(B, "select public.retirer_appareil_push($1)", [jetonA]);
  return (await nbJetons(jetonA)) === 0;
});
await vrai("suppression du compte : jetons et file supprimés", async () => {
  await sortie(B, (await en(B, `select public.creer_produit($1, '{"nom":"Café","seuil_alerte":5}', 6) as id`, [eB]))[0].id, 2);
  const avant = (await file(eB)).length;
  await en(B, "select public.supprimer_mon_compte()");
  return avant === 1 && (await nbJetons(jetonB)) === 0 && (await file(eB)).length === 0;
});

process.exit(bilan() ? 1 : 0);

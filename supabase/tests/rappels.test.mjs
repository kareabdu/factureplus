// Tests des rappels d'abonnement par e-mail (sélection des destinataires, sans doublon).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");     // essai qui finit dans 2 jours
const B = await creerUser("bakary@exemple.sn");  // abonnement expiré hier
const C = await creerUser("coumba@exemple.sn");  // abonnement en cours (fin lointaine)
const D = await creerUser("demba@exemple.sn");   // essai expiré il y a 10 jours
const E = await creerUser("eva@exemple.sn");     // fin proche mais rappels désactivés
const J = "2026-11-16";
const maj = (u, champs) => en(null, `update public.profils set ${champs} where id=$1`, [u.id]);
await maj(A, `essai_fin = '2026-11-18 10:00+00'`);
await maj(B, `essai_fin = '2026-10-01', abonnement_statut = 'actif', abonnement_fin = '2026-11-15'`);
await maj(C, `essai_fin = '2026-10-01', abonnement_statut = 'actif', abonnement_fin = '2027-01-01'`);
await maj(D, `essai_fin = '2026-11-06'`);
await maj(E, `essai_fin = '2026-11-17', rappels_email = false`);
const reserver = (jour = J) => en(null, "select * from public.reserver_rappels_abonnement($1)", [jour]);

console.log("Sélection");
const lot = await reserver();
const par = (email) => lot.find((r) => r.email === email);
await vrai("essai qui se termine dans 2 jours : fin proche", async () => par("awa@exemple.sn")?.type === "fin_proche" && par("awa@exemple.sn")?.etat === "essai");
await vrai("abonnement terminé hier : expiré", async () => par("bakary@exemple.sn")?.type === "expire" && par("bakary@exemple.sn")?.etat === "actif");
await vrai("abonnement en cours, fin lointaine : rien", async () => !par("coumba@exemple.sn"));
await vrai("expiration ancienne : rien (pas de rappel tardif)", async () => !par("demba@exemple.sn"));
await vrai("rappels désactivés : rien", async () => !par("eva@exemple.sn"));

console.log("Sans doublon");
await vrai("même jour, second appel : aucun rappel", async () => (await reserver()).length === 0);
await vrai("lendemain : pas de nouveau rappel « fin proche » pour la même échéance", async () =>
  !(await reserver("2026-11-17")).some((r) => r.email === "awa@exemple.sn"));
await vrai("après la fin de l'essai : rappel « expiré »", async () =>
  (await reserver("2026-11-19")).some((r) => r.email === "awa@exemple.sn" && r.type === "expire"));
await vrai("abonnement renouvelé : nouvelle échéance, nouveau rappel le moment venu", async () => {
  await maj(B, `abonnement_fin = '2026-12-15'`);
  return (await reserver("2026-12-14")).some((r) => r.email === "bakary@exemple.sn" && r.type === "fin_proche");
});

console.log("Droits");
await echoue("un utilisateur ne peut pas réserver les rappels", () => en(A, "select * from public.reserver_rappels_abonnement()"), "permission denied");
await echoue("un utilisateur ne lit pas le journal", () => en(A, "select * from public.rappels_abonnement"), "permission denied");
await vrai("l'utilisateur désactive ses rappels", async () => {
  await en(A, "update public.profils set rappels_email = false where id = $1", [A.id]);
  return (await en(null, "select rappels_email from public.profils where id=$1", [A.id]))[0].rappels_email === false;
});
await vrai("suppression du compte : journal supprimé", async () => {
  await en(null, "delete from auth.users where id=$1", [B.id]);
  return (await en(null, "select count(*)::int as n from public.rappels_abonnement where user_id=$1", [B.id]))[0].n === 0;
});

process.exit(bilan() ? 1 : 0);

// Tests du socle : profils, équipes, paramètres, isolation.
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { db, en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("Awa@exemple.sn", "Awa Diop");
const B = await creerUser("bakary@exemple.sn", "Bakary");

console.log("Profils");
await vrai("profil créé, e-mail en minuscules, essai de 7 jours", async () => {
  const [p] = await en(null, "select email, abonnement_statut, essai_fin > now() + interval '6 days' as ok from public.profils where id=$1", [A.id]);
  return p.email === "awa@exemple.sn" && p.abonnement_statut === "essai" && p.ok;
});
await vrai("A ne voit que son profil", async () => (await en(A, "select * from public.profils")).length === 1);
await echoue("A ne peut pas s'activer un abonnement", () =>
  en(A, "update public.profils set abonnement_statut='actif' where id=$1", [A.id]), "permission denied");
await vrai("A modifie son nom", async () =>
  (await en(A, "update public.profils set nom_complet='Awa D.' where id=$1 returning id", [A.id])).length === 1);

console.log("Équipe");
await echoue("anonyme ne peut pas créer d'équipe", async () => {
  await db.exec("set role anon");
  try { await db.query("select public.creer_equipe('X')"); } finally { await db.exec("reset role"); }
}, "permission denied");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await vrai("A est propriétaire", async () => (await en(A, "select * from public.mes_equipes()"))[0].role === "proprietaire");
await vrai("paramètres créés par défaut", async () => {
  const [p] = await en(A, "select * from public.parametres where equipe_id=$1", [eA]);
  return p.nom_entreprise === "Diop Commerce" && p.devise === "XOF" && p.prefixe_facture === "FAC-";
});
await echoue("insertion directe d'équipe interdite", () => en(A, "insert into public.equipes (nom) values ('Pirate')"), "permission denied");
await echoue("insertion directe de membre interdite", () =>
  en(B, "insert into public.membres_equipe (equipe_id, user_id) values ($1,$2)", [eA, B.id]), "permission denied");

console.log("Isolation");
await vrai("B ne voit pas l'équipe de A", async () => (await en(B, "select * from public.equipes")).length === 0);
await vrai("B ne voit pas les paramètres de A", async () => (await en(B, "select * from public.parametres")).length === 0);
await vrai("UPDATE des paramètres par B sans effet", async () =>
  (await en(B, "update public.parametres set nom_entreprise='Volée' where equipe_id=$1 returning 1", [eA])).length === 0);
await vrai("A modifie ses paramètres", async () =>
  (await en(A, "update public.parametres set taxe_type='total', taxe_taux=18 where equipe_id=$1 returning 1", [eA])).length === 1);
await echoue("fonctions privées non appelables", () => en(A, "select prive.prochain_numero($1,'facture')", [eA]), "permission denied");

console.log("Numérotation");
await vrai("format {PREFIX}{YYYY}-{N:04d}", async () =>
  (await en(null, "select prive.formater_numero('{PREFIX}{YYYY}-{N:04d}','FAC-',2026,7) as n"))[0].n === "FAC-2026-0007");
await vrai("compteur sans trou, par année", async () => {
  const n = async (d) => (await en(null, "select prive.prochain_numero($1,'facture',$2::date) as n", [eA, d]))[0].n;
  return (await n("2026-01-01")) === 1 && (await n("2026-05-01")) === 2 && (await n("2027-01-01")) === 1;
});

process.exit(bilan() ? 1 : 0);

// Message d'abonnement expiré : neutre (aucune invitation à payer, règles de l'App Store).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await en(null, "update public.profils set essai_fin = now() - interval '1 day' where id=$1", [A.id]);

console.log("Message d'abonnement expiré");
let erreur;
try {
  await en(A, "insert into public.clients (equipe_id, nom) values ($1, 'Fatou')", [eA]);
} catch (e) {
  erreur = e;
}
await vrai("écriture refusée avec le message neutre", async () =>
  erreur?.message === "Votre accès a expiré : vos données sont en lecture seule.");
await vrai("aucune invitation à s'abonner ou à payer", async () => !/abonn|pay/i.test(erreur?.message ?? "abonn"));
await vrai("indice technique conservé (abonnement_expire)", async () => erreur?.hint === "abonnement_expire");

process.exit(bilan() ? 1 : 0);

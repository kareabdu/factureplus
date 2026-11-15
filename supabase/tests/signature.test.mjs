// Tests de la signature des factures (paramètres).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await en(B, "select public.creer_equipe('Bakary Shop')");
const signature = async () => (await en(A, "select signature_url from public.parametres where equipe_id=$1", [eA]))[0].signature_url;

console.log("Signature");
await vrai("par défaut : pas de signature", async () => (await signature()) === null);
await vrai("l'administrateur enregistre sa signature", async () => {
  await en(A, "update public.parametres set signature_url='https://x/s.svg' where equipe_id=$1", [eA]);
  return (await signature()) === "https://x/s.svg";
});
await vrai("suppression de la signature", async () => {
  await en(A, "update public.parametres set signature_url=null where equipe_id=$1", [eA]);
  return (await signature()) === null;
});
await vrai("B ne modifie pas la signature de A", async () =>
  (await en(B, "update public.parametres set signature_url='https://y/s.png' where equipe_id=$1 returning 1", [eA])).length === 0
  && (await signature()) === null);
await vrai("cachet séparé retiré", async () =>
  (await en(null, "select count(*)::int as n from information_schema.columns where table_name='parametres' and column_name='cachet_url'"))[0].n === 0);

process.exit(bilan() ? 1 : 0);

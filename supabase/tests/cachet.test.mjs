// Tests de la signature et du cachet de l'entreprise (paramètres).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await en(B, "select public.creer_equipe('Bakary Shop')");
const params = async () => (await en(A, "select signature_url, cachet_url from public.parametres where equipe_id=$1", [eA]))[0];

console.log("Signature et cachet");
await vrai("par défaut : ni signature ni cachet", async () => {
  const p = await params(); return p.signature_url === null && p.cachet_url === null;
});
await vrai("l'administrateur enregistre sa signature et son cachet", async () => {
  await en(A, "update public.parametres set signature_url='https://x/s.png', cachet_url='https://x/c.png' where equipe_id=$1", [eA]);
  const p = await params(); return p.signature_url === "https://x/s.png" && p.cachet_url === "https://x/c.png";
});
await vrai("retrait du cachet", async () => {
  await en(A, "update public.parametres set cachet_url=null where equipe_id=$1", [eA]);
  return (await params()).cachet_url === null;
});
await echoue("adresse trop longue refusée", () =>
  en(A, "update public.parametres set cachet_url=$2 where equipe_id=$1", [eA, "https://x/" + "a".repeat(600)]), "check constraint");
await vrai("B ne modifie pas le cachet de A", async () =>
  (await en(B, "update public.parametres set cachet_url='https://y/c.png' where equipe_id=$1 returning 1", [eA])).length === 0
  && (await params()).cachet_url === null);

process.exit(bilan() ? 1 : 0);

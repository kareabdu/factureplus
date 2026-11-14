// Tests des liens courts vers le PDF d'un document (envoi WhatsApp).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await en(B, "select public.creer_equipe('Bakary Shop')");

const fac = (await en(A, "select public.enregistrer_document($1,'facture',null,$2,$3) as id", [eA,
  JSON.stringify({ client_nom: "Moussa" }), JSON.stringify([{ designation: "Service", prix_unitaire: 5000, quantite: 1 }])]))[0].id;
const chemin = `${eA}/${fac}/FAC-2026-0001.pdf`;
const lien = async (u, c = chemin, jours = null) =>
  (await en(u, "select public.lien_court_document($1, $2, $3) as code", [fac, c, jours]))[0].code;

console.log("Création");
const code = await lien(A);
await vrai("code court de 11 caractères sûrs pour une URL", async () => /^[A-Za-z0-9_-]{11}$/.test(code));
await vrai("valable 30 jours", async () => {
  const r = (await en(null, "select expire_le from public.liens_documents where code=$1", [code]))[0];
  const jours = (new Date(r.expire_le) - Date.now()) / 86_400_000;
  return jours > 29.9 && jours <= 30;
});
await vrai("même document : même code, validité prolongée", async () => {
  await en(null, "update public.liens_documents set expire_le = now() + interval '1 day' where code=$1", [code]);
  const c2 = await lien(A);
  const r = (await en(null, "select expire_le from public.liens_documents where code=$1", [code]))[0];
  return c2 === code && new Date(r.expire_le) - Date.now() > 29 * 86_400_000;
});
await vrai("durée bornée à 90 jours", async () => {
  await lien(A, chemin, 1000);
  const r = (await en(null, "select expire_le from public.liens_documents where code=$1", [code]))[0];
  return (new Date(r.expire_le) - Date.now()) / 86_400_000 <= 90;
});

console.log("Contrôles");
await echoue("chemin hors du dossier du document refusé", () => lien(A, `${eA}/autre/FAC.pdf`), "Chemin de fichier invalide");
await echoue("fichier qui n'est pas un PDF refusé", () => lien(A, `${eA}/${fac}/FAC.exe`), "Chemin de fichier invalide");
await echoue("B ne crée pas de lien pour le document de A", () => lien(B), "Accès refusé");
await echoue("sans connexion : refusé", () => en(null, "select public.lien_court_document($1,$2)", [fac, chemin]), "Accès refusé");
await echoue("écriture directe interdite", () =>
  en(A, "insert into public.liens_documents (code, equipe_id, document_id, chemin, expire_le) values ('x',$1,$2,'a.pdf',now())", [eA, fac]),
  "permission denied");
await vrai("A lit le lien de son document", async () => (await en(A, "select code from public.liens_documents")).length === 1);
await vrai("B ne voit pas les liens de A", async () => (await en(B, "select code from public.liens_documents")).length === 0);

console.log("Suppression");
await vrai("brouillon supprimé : lien supprimé", async () => {
  await en(A, "delete from public.documents where id=$1", [fac]);
  return (await en(null, "select count(*) as n from public.liens_documents where code=$1", [code]))[0].n == 0;
});

process.exit(bilan() ? 1 : 0);

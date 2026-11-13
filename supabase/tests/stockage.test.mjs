// Tests des règles d'accès aux fichiers (compartiments « documents » et « produits »).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase({ stockage: true });

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
const eB = (await en(B, "select public.creer_equipe('Bakary Shop') as id"))[0].id;

// Dépôt simple (INSERT sans relecture, comme l'API de stockage) puis comptage côté serveur
const deposer = async (u, bucket, chemin) => {
  await en(u, "insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, chemin]);
  return en(null, "select id from storage.objects where bucket_id = $1 and name = $2", [bucket, chemin]);
};

console.log("Compartiments");
await vrai("« documents » et « recus » privés, « produits » public", async () => {
  const b = await en(null, "select id, public from storage.buckets order by id");
  return b.length === 3 && b[0].id === "documents" && !b[0].public && b[1].id === "produits" && b[1].public
    && b[2].id === "recus" && !b[2].public;
});

console.log("PDF des documents");
await vrai("A dépose un PDF dans le dossier de son équipe", async () =>
  (await deposer(A, "documents", `${eA}/facture-1.pdf`)).length === 1);
await echoue("A ne dépose pas dans le dossier d'une autre équipe", () => deposer(A, "documents", `${eB}/pirate.pdf`), "row-level security");
await echoue("A ne dépose pas à la racine", () => deposer(A, "documents", "racine.pdf"));
await vrai("A relit son PDF", async () => (await en(A, "select * from storage.objects where bucket_id='documents'")).length === 1);
await vrai("B ne voit pas le PDF de A", async () => (await en(B, "select * from storage.objects where bucket_id='documents'")).length === 0);
await vrai("A remplace son PDF (enregistrement à nouveau)", async () =>
  (await en(A, "update storage.objects set owner = owner where bucket_id='documents' and name=$1 returning id", [`${eA}/facture-1.pdf`])).length === 1);
await vrai("B ne peut pas remplacer ni supprimer le PDF de A", async () => {
  const maj = await en(B, "update storage.objects set name='x' where bucket_id='documents' returning id");
  const sup = await en(B, "delete from storage.objects where bucket_id='documents' returning id");
  return maj.length === 0 && sup.length === 0;
});

console.log("Images produits");
await vrai("A dépose une photo produit dans son dossier", async () => (await deposer(A, "produits", `${eA}/photo.jpg`)).length === 1);
await echoue("B ne dépose pas de photo chez A", () => deposer(B, "produits", `${eA}/photo2.jpg`), "row-level security");

process.exit(bilan() ? 1 : 0);

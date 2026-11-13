// Tests des dépenses (table simple) et du compartiment privé des reçus.
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase({ stockage: true });

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
const eB = (await en(B, "select public.creer_equipe('Bakary Shop') as id"))[0].id;

const ajouter = (u, equipe, champs = {}) => en(u,
  `insert into public.depenses (equipe_id, commercant, montant, categorie, moyen_paiement, date_depense)
   values ($1, $2, $3, $4, $5, $6) returning id`,
  [equipe, champs.commercant ?? "Senelec", champs.montant ?? 25000, champs.categorie ?? "facture",
    champs.moyen ?? "wave", champs.date ?? "2026-11-05"]);

console.log("Saisie");
const d1 = (await ajouter(A, eA))[0].id;
await vrai("A enregistre une dépense (auteur renseigné)", async () => {
  const d = (await en(A, "select * from public.depenses where id=$1", [d1]))[0];
  return Number(d.montant) === 25000 && d.created_by === A.id && d.categorie === "facture";
});
await echoue("montant nul refusé", () => ajouter(A, eA, { montant: 0 }), "check constraint");
await echoue("catégorie inconnue refusée", () => ajouter(A, eA, { categorie: "loisirs" }), "check constraint");
await echoue("moyen de paiement inconnu refusé", () => ajouter(A, eA, { moyen: "bitcoin" }), "check constraint");
await echoue("commerçant vide refusé", () => ajouter(A, eA, { commercant: "  " }), "check constraint");
await vrai("A modifie sa dépense", async () => {
  await en(A, "update public.depenses set montant=30000, categorie='loyer' where id=$1", [d1]);
  const d = (await en(A, "select * from public.depenses where id=$1", [d1]))[0];
  return Number(d.montant) === 30000 && d.categorie === "loyer";
});
await echoue("l'auteur n'est pas modifiable", () =>
  en(A, "update public.depenses set created_by=$2 where id=$1", [d1, B.id]), "permission denied");

console.log("Isolation des équipes");
await vrai("B ne voit pas les dépenses de A", async () => (await en(B, "select * from public.depenses")).length === 0);
await echoue("B n'enregistre pas de dépense pour A", () => ajouter(B, eA), "row-level security");
await vrai("B ne modifie ni ne supprime la dépense de A", async () => {
  const m = await en(B, "update public.depenses set montant=1 where id=$1 returning 1", [d1]);
  const s = await en(B, "delete from public.depenses where id=$1 returning 1", [d1]);
  return m.length === 0 && s.length === 0;
});

console.log("Reçus");
const deposer = async (u, chemin) => {
  await en(u, "insert into storage.objects (bucket_id, name) values ('recus', $1)", [chemin]);
  return en(null, "select id from storage.objects where bucket_id = 'recus' and name = $1", [chemin]);
};
await vrai("A dépose un reçu dans le dossier de son équipe", async () => (await deposer(A, `${eA}/recu-1.jpg`)).length === 1);
await echoue("A ne dépose pas dans le dossier de B", () => deposer(A, `${eB}/pirate.jpg`), "row-level security");
await vrai("B ne voit pas le reçu de A", async () =>
  (await en(B, "select * from storage.objects where bucket_id='recus'")).length === 0);
await vrai("A supprime sa dépense", async () => {
  await en(A, "delete from public.depenses where id=$1", [d1]);
  return (await en(A, "select * from public.depenses")).length === 0;
});

process.exit(bilan() ? 1 : 0);

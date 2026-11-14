// Tests des images dans les notes d'un document.
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
const eB = (await en(B, "select public.creer_equipe('Bakary Shop') as id"))[0].id;

const url = (equipe, n) => `https://x.supabase.co/storage/v1/object/public/produits/${equipe}/${n}.jpg`;
const lignes = JSON.stringify([{ designation: "Service", prix_unitaire: 5000, quantite: 1 }]);
const enregistrer = (id, entete, type = "facture") =>
  en(A, "select public.enregistrer_document($1,$2,$3,$4,$5) as id", [eA, type, id, JSON.stringify(entete), lignes]);
const images = async (id) => (await en(A, "select images_notes from public.documents where id=$1", [id]))[0].images_notes;

console.log("Enregistrement");
const f = (await enregistrer(null, { client_nom: "Moussa", notes: "Voir photo", images_notes: [url(eA, 1), url(eA, 2), url(eA, 1)] }))[0].id;
await vrai("images enregistrées, doublon retiré", async () => JSON.stringify(await images(f)) === JSON.stringify([url(eA, 1), url(eA, 2)]));
await enregistrer(f, { client_nom: "Moussa", notes: "Voir photo" });
await vrai("clé absente (ancienne app) : images conservées", async () => (await images(f)).length === 2);
await enregistrer(f, { client_nom: "Moussa", images_notes: [] });
await vrai("liste vide : images retirées", async () => (await images(f)).length === 0);
await vrai("sans images : tableau vide par défaut", async () =>
  (await images((await enregistrer(null, { client_nom: "Awa" }))[0].id)).length === 0);

console.log("Contrôles");
await echoue("image d'une autre équipe refusée", () => enregistrer(f, { client_nom: "M", images_notes: [url(eB, 1)] }), "Image des notes invalide");
await echoue("adresse extérieure refusée", () => enregistrer(f, { client_nom: "M", images_notes: ["https://exemple.com/a.jpg"] }), "Image des notes invalide");
await echoue("plus de 4 images refusées", () =>
  enregistrer(f, { client_nom: "M", images_notes: [1, 2, 3, 4, 5].map((n) => url(eA, n)) }), "Quatre images au plus");
await echoue("format invalide refusé", () => enregistrer(f, { client_nom: "M", images_notes: "a.jpg" }), "Images des notes invalides");

console.log("Conversion");
const p = (await enregistrer(null, { client_nom: "Moussa", images_notes: [url(eA, 3)] }, "proforma"))[0].id;
await en(A, "select public.valider_document($1)", [p]);
const fp = (await en(A, "select public.convertir_proforma($1) as id", [p]))[0].id;
await vrai("proforma convertie : images reprises", async () => JSON.stringify(await images(fp)) === JSON.stringify([url(eA, 3)]));

process.exit(bilan() ? 1 : 0);

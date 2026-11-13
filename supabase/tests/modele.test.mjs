// Tests du modèle de document (choix de la mise en page et de la couleur).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await en(B, "select public.creer_equipe('Bakary Shop')");
const params = async () => (await en(A, "select * from public.parametres where equipe_id=$1", [eA]))[0];

console.log("Modèle de document");
await vrai("par défaut : classique, couleur FacturePlus", async () => {
  const p = await params(); return p.modele_document === "classique" && p.couleur_document === "#147A2E";
});
await vrai("l'administrateur choisit le modèle moderne et sa couleur", async () => {
  await en(A, "update public.parametres set modele_document='moderne', couleur_document='#0E9384' where equipe_id=$1", [eA]);
  const p = await params(); return p.modele_document === "moderne" && p.couleur_document === "#0E9384";
});
await echoue("modèle inconnu refusé", () =>
  en(A, "update public.parametres set modele_document='baroque' where equipe_id=$1", [eA]), "check constraint");
await echoue("couleur invalide refusée", () =>
  en(A, "update public.parametres set couleur_document='vert' where equipe_id=$1", [eA]), "check constraint");
await vrai("B ne modifie pas le modèle de A", async () =>
  (await en(B, "update public.parametres set modele_document='bandeau' where equipe_id=$1 returning 1", [eA])).length === 0
  && (await params()).modele_document === "moderne");

process.exit(bilan() ? 1 : 0);

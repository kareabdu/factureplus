// Tests du livreur des bons de livraison.
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
const lignes = JSON.stringify([{ designation: "Riz", prix_unitaire: 1000, quantite: 2 }]);
const facture = async () => {
  const id = (await en(A, "select public.enregistrer_document($1,'facture',null,'{\"client_nom\":\"Moussa\"}',$2) as id", [eA, lignes]))[0].id;
  await en(A, "select public.valider_document($1)", [id]);
  return id;
};
const livreur = async (bl) => (await en(A, "select livreur from public.documents where id = $1", [bl]))[0].livreur;

const f = await facture();
const bl = (await en(A, "select public.creer_bl($1, $2) as id", [f, "  Moussa Diack  "]))[0].id;
await vrai("livreur enregistré (espaces retirés)", async () => (await livreur(bl)) === "Moussa Diack");

const bl2 = (await en(A, "select public.creer_bl($1) as id", [f]))[0].id;
await vrai("sans livreur : vide", async () => (await livreur(bl2)) === null);

const bl3 = (await en(A, "select public.creer_bl($1, $2) as id", [f, "   "]))[0].id;
await vrai("livreur blanc : vide", async () => (await livreur(bl3)) === null);

process.exit(bilan() ? 1 : 0);

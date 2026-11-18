// Tests des documents figés : facture annulée, proforma acceptée / refusée, bon de livraison.
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
const entete = '{"client_nom":"Moussa"}';
const lignes = JSON.stringify([{ designation: "Riz", prix_unitaire: 1000, quantite: 2 }]);
const creer = async (type) => {
  const id = (await en(A, "select public.enregistrer_document($1,$2,null,$3,$4) as id", [eA, type, entete, lignes]))[0].id;
  await en(A, "select public.valider_document($1)", [id]);
  return id;
};
const modifier = (type, id) => en(A, "select public.enregistrer_document($1,$2,$3,$4,$5)", [eA, type, id, entete, lignes]);

const f = await creer("facture");
await vrai("facture émise : modifiable", async () => { await modifier("facture", f); return true; });
await en(A, "select public.annuler_document($1)", [f]);
await echoue("facture annulée : refusée", () => modifier("facture", f), "Document annulé");

const pa = await creer("proforma");
await vrai("proforma envoyée : modifiable", async () => { await modifier("proforma", pa); return true; });
await en(A, "select public.convertir_proforma($1)", [pa]);
await echoue("proforma acceptée : refusée", () => modifier("proforma", pa), "Proforma acceptée ou refusée");

const pr = await creer("proforma");
await en(A, "select public.refuser_proforma($1)", [pr]);
await echoue("proforma refusée : refusée", () => modifier("proforma", pr), "Proforma acceptée ou refusée");

const f2 = await creer("facture");
const bl = (await en(A, "select public.creer_bl($1) as id", [f2]))[0].id;
await echoue("bon de livraison : refusé", () => modifier("bl", bl), "Bon de livraison");

process.exit(bilan() ? 1 : 0);

// Tests du tableau de bord par période (début et fin).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
await en(B, "select public.creer_equipe('Bakary Shop')");

const riz = (await en(A, `select public.creer_produit($1, '{"nom":"Riz","prix_vente":10000,"prix_achat":6000}', 100) as id`, [eA]))[0].id;
// Factures à dates fixes (5 et 20 janvier, 10 février 2025) : aucun effet de la date du jour
const facture = async (date, q) => {
  const f = (await en(A, "select public.enregistrer_document($1,'facture',null,$2,$3) as id", [eA,
    JSON.stringify({ client_nom: "Client", date }),
    JSON.stringify([{ produit_id: riz, designation: "Riz", prix_unitaire: 10000, quantite: q }])]))[0].id;
  await en(A, "select public.valider_document($1)", [f]);
  return f;
};
const f1 = await facture("2025-01-05", 1);
await facture("2025-01-20", 2);
await facture("2025-02-10", 4);
await en(A, "select public.enregistrer_reglement($1, 10000, 'especes', '2025-01-06')", [f1]);

const resume = async (debut, fin) =>
  (await en(A, "select public.resume_tableau_de_bord($1,$2,$3) as r", [eA, debut, fin]))[0].r;

console.log("Période");
await vrai("janvier : 2 factures, 30000, marge 12000", async () => {
  const r = await resume("2025-01-01", "2025-01-31");
  return r.nb_factures_periode === 2 && Number(r.ventes_periode) === 30000 && Number(r.marge_periode) === 12000;
});
await vrai("fin incluse : le 20 janvier sur [20 ; 20]", async () =>
  Number((await resume("2025-01-20", "2025-01-20")).ventes_periode) === 20000);
await vrai("sans fin : tout depuis le 1er janvier (comportement d'origine)", async () =>
  Number((await resume("2025-01-01", null)).ventes_periode) === 70000);
await vrai("encaissé et meilleures ventes bornés à février", async () => {
  const r = await resume("2025-02-01", "2025-02-28");
  return Number(r.encaisse_periode) === 0 && Number(r.meilleurs_produits[0].chiffre) === 40000;
});
await vrai("ventes par jour de la période", async () => {
  const j = (await resume("2025-01-01", "2025-01-31")).ventes_jours_periode;
  return j.length === 2 && j[0].jour === "2025-01-05" && Number(j[1].total) === 20000;
});
await vrai("valeurs du moment inchangées (stock 93 × 6000, impayés 60000)", async () => {
  const r = await resume("2025-01-01", "2025-01-31");
  return Number(r.valeur_stock_achat) === 93 * 6000 && Number(r.impayes) === 60000;
});
await vrai("appel sans période toujours valide (mois en cours)", async () =>
  (await en(A, "select public.resume_tableau_de_bord($1) as r", [eA]))[0].r.nb_produits === 1);
await echoue("fin avant début refusée", () => resume("2025-02-01", "2025-01-01"), "postérieure");
await echoue("B ne lit pas le tableau de bord de A", () =>
  en(B, "select public.resume_tableau_de_bord($1,'2025-01-01','2025-12-31')", [eA]), "Accès refusé");

process.exit(bilan() ? 1 : 0);

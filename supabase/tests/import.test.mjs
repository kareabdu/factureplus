// Tests de l'import du catalogue produits (CSV / Excel analysés côté client).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, echoue, creerUser, bilan } = await creerBase();

const A = await creerUser("awa@exemple.sn");
const B = await creerUser("bakary@exemple.sn");
const eA = (await en(A, "select public.creer_equipe('Diop Commerce') as id"))[0].id;
const eB = (await en(B, "select public.creer_equipe('Bakary Shop') as id"))[0].id;

const importer = async (u, lignes, equipe = eA) =>
  (await en(u, "select public.importer_produits($1, $2) as b", [equipe, JSON.stringify(lignes)]))[0].b;
const produit = async (nom) => (await en(null, "select * from public.produits where equipe_id=$1 and nom=$2", [eA, nom]))[0];
const mouvements = async (id) =>
  en(null, "select type, variation, motif from public.mouvements_stock where produit_id=$1 order by id", [id]);

console.log("Création");
const bilan1 = await importer(A, [
  { numero: 2, produit_id: null, nom: "Riz 25 kg", reference: "RIZ-25", code_barres: "611", categorie: "Alimentation",
    unite: "Sac", prix_vente: 17500, prix_achat: 15000, quantite: 40, seuil_alerte: 10 },
  { numero: 3, produit_id: null, nom: "Huile", categorie: "alimentation", prix_vente: 1500, actif: false },
  { numero: 4, produit_id: null, nom: "Savon" },
]);
await vrai("bilan : 3 créés, 1 stock, 1 catégorie", async () =>
  bilan1.crees === 3 && bilan1.modifies === 0 && bilan1.stocks_ajustes === 1 && bilan1.categories_creees === 1);
const riz = await produit("Riz 25 kg");
await vrai("valeurs du fichier enregistrées", async () =>
  riz.reference === "RIZ-25" && riz.code_barres === "611" && riz.unite === "Sac" && Number(riz.prix_vente) === 17500
  && Number(riz.seuil_alerte) === 10);
await vrai("stock initial par mouvement d'entrée", async () => {
  const m = await mouvements(riz.id);
  return Number(riz.quantite) === 40 && m.length === 1 && m[0].type === "entree" && m[0].motif === "Stock initial";
});
await vrai("catégorie retrouvée sans tenir compte de la casse", async () =>
  (await produit("Huile")).categorie_id === riz.categorie_id);
await vrai("produit importé inactif", async () => (await produit("Huile")).actif === false);
await vrai("référence automatique et unité par défaut sans valeur", async () => {
  const s = await produit("Savon");
  return s.reference === "P-0002" && s.unite === "Pcs" && Number(s.quantite) === 0;
});

console.log("Mise à jour");
const bilan2 = await importer(A, [
  { numero: 2, produit_id: riz.id, nom: "Riz parfumé 25 kg", prix_vente: 18000, quantite: 35 },
  { numero: 3, produit_id: (await produit("Savon")).id, quantite: 0, description: "Savon de Marseille" },
]);
await vrai("bilan : 2 modifiés, 1 stock ajusté (quantité identique ignorée)", async () =>
  bilan2.modifies === 2 && bilan2.stocks_ajustes === 1 && bilan2.crees === 0);
await vrai("champs absents inchangés", async () => {
  const r = await produit("Riz parfumé 25 kg");
  return Number(r.prix_vente) === 18000 && Number(r.prix_achat) === 15000 && r.code_barres === "611" && r.unite === "Sac";
});
await vrai("quantité par ajustement « Import »", async () => {
  const m = await mouvements(riz.id);
  return Number((await produit("Riz parfumé 25 kg")).quantite) === 35 && m.length === 2
    && m[1].type === "ajustement" && Number(m[1].variation) === -5 && m[1].motif === "Import";
});
await vrai("alerte créée si la quantité passe sous le seuil", async () => {
  await importer(A, [{ numero: 2, produit_id: riz.id, quantite: 8 }]);
  return (await en(A, "select * from public.alertes_stock where produit_id=$1 and statut='active'", [riz.id])).length === 1;
});

console.log("Erreurs : tout ou rien");
await echoue("code-barres en double : numéro de ligne dans le message", () => importer(A, [
  { numero: 2, produit_id: null, nom: "Nouveau" },
  { numero: 7, produit_id: null, nom: "Autre", code_barres: "611" },
]), "Ligne 7 : code-barres déjà utilisé");
await vrai("rien n'a été créé", async () => !(await produit("Nouveau")));
await echoue("nom obligatoire en création", () =>
  importer(A, [{ numero: 5, produit_id: null, prix_vente: 10 }]), "Ligne 5 : Nom obligatoire");
await echoue("quantité négative refusée", () =>
  importer(A, [{ numero: 2, produit_id: riz.id, quantite: -1 }]), "Ligne 2 : Quantité négative");
await echoue("nombre invalide", () =>
  importer(A, [{ numero: 3, produit_id: riz.id, prix_vente: "abc" }]), "Ligne 3 : nombre invalide");
await echoue("nom trop long", () =>
  importer(A, [{ numero: 4, produit_id: null, nom: "x".repeat(201) }]), "Ligne 4 : valeur invalide");
await echoue("plus de 5000 lignes refusées", () =>
  importer(A, Array.from({ length: 5001 }, (_, i) => ({ numero: i + 2, produit_id: null, nom: `P${i}` }))), "5000");

console.log("Contrôles d'accès");
await echoue("B n'importe pas dans l'équipe de A", () =>
  importer(B, [{ numero: 2, produit_id: null, nom: "Pirate" }]), "Accès refusé");
await echoue("B ne modifie pas un produit de A depuis son équipe", () =>
  importer(B, [{ numero: 2, produit_id: riz.id, prix_vente: 1 }], eB), "Produit introuvable");
await echoue("abonnement expiré : import refusé", async () => {
  await en(null, "update public.profils set essai_fin = now() - interval '1 day' where id=$1", [A.id]);
  await importer(A, [{ numero: 2, produit_id: null, nom: "Après expiration" }]);
}, "accès a expiré");

process.exit(bilan() ? 1 : 0);

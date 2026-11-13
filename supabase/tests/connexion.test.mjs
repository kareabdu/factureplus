// Tests de la création de profil selon le mode d'inscription (e-mail ou Google).
// Lancer : pnpm test:db
import { creerBase } from "./outils.mjs";

const { en, vrai, creerUser, bilan } = await creerBase();

/** Compte créé par la connexion Google : métadonnées full_name / name. */
async function compteGoogle(email, meta) {
  return (await en(null, `insert into auth.users (email, email_confirmed_at, raw_user_meta_data)
    values ($1, now(), $2) returning id`, [email, JSON.stringify(meta)]))[0];
}
const profil = async (id) => (await en(null, "select * from public.profils where id = $1", [id]))[0];

console.log("Profil à l'inscription");
await vrai("inscription par e-mail : nom saisi", async () => {
  const u = await creerUser("awa@exemple.sn", "Awa Diop");
  return (await profil(u.id)).nom_complet === "Awa Diop";
});
await vrai("Google : nom complet (full_name)", async () => {
  const u = await compteGoogle("Moussa@Gmail.com", { full_name: "Moussa Ndiaye", name: "Moussa" });
  const p = await profil(u.id);
  return p.nom_complet === "Moussa Ndiaye" && p.email === "moussa@gmail.com";
});
await vrai("Google : à défaut, name", async () => {
  const u = await compteGoogle("fatou@gmail.com", { name: "Fatou Sow" });
  return (await profil(u.id)).nom_complet === "Fatou Sow";
});
await vrai("sans nom : profil créé, nom vide", async () => {
  const u = await compteGoogle("anonyme@gmail.com", {});
  return (await profil(u.id)).nom_complet === null;
});
await vrai("nom trop long tronqué à 120 caractères", async () => {
  const u = await compteGoogle("long@gmail.com", { full_name: "x".repeat(200) });
  return (await profil(u.id)).nom_complet.length === 120;
});
await vrai("le nouveau compte Google démarre en essai", async () => {
  const u = await compteGoogle("essai@gmail.com", { full_name: "Essai" });
  return (await en(null, "select prive.etat_abonnement($1) as e", [u.id]))[0].e === "essai";
});

process.exit(bilan() ? 1 : 0);

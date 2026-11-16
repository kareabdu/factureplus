import { formaterMontant, formaterQuantite } from "./montants";
import type { Categorie, Parametres, Produit } from "./types";

/**
 * Liste des produits en HTML autonome, format A4 : imprimée en PDF (mobile : expo-print ;
 * web : impression du navigateur). Produits actifs, triés par catégorie puis par nom, avec stock,
 * prix et valeur du stock (au prix d'achat).
 */

const echapper = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Nom de fichier daté : « liste-produits-2026-11-16 ». */
export function nomFichierPdfProduits(date = new Date()): string {
  const j = (n: number) => String(n).padStart(2, "0");
  return `liste-produits-${date.getFullYear()}-${j(date.getMonth() + 1)}-${j(date.getDate())}`;
}

export function htmlListeProduits(args: {
  produits: readonly Produit[];
  categories: readonly Pick<Categorie, "id" | "nom">[];
  parametres: Parametres;
  date?: Date;
}): string {
  const { parametres: p, date = new Date() } = args;
  const couleur = /^#[0-9A-Fa-f]{6}$/.test(p.couleur_document ?? "") ? p.couleur_document : "#147A2E";
  const m = (v: number) => formaterMontant(v, p.symbole_devise);
  const nomsCategories = new Map(args.categories.map((c) => [c.id, c.nom]));
  const categorie = (x: Produit) => (x.categorie_id ? nomsCategories.get(x.categorie_id) ?? "" : "");

  const produits = args.produits.filter((x) => x.actif)
    .sort((a, b) => categorie(a).localeCompare(categorie(b), "fr") || a.nom.localeCompare(b.nom, "fr"));
  const valeurAchat = produits.reduce((s, x) => s + Math.max(0, Number(x.quantite)) * x.prix_achat, 0);
  const valeurVente = produits.reduce((s, x) => s + Math.max(0, Number(x.quantite)) * x.prix_vente, 0);
  const ruptures = produits.filter((x) => Number(x.quantite) <= 0).length;

  const lignes = produits.map((x) => {
    const q = Number(x.quantite);
    const etat = q <= 0 ? "rupture" : x.seuil_alerte > 0 && q <= x.seuil_alerte ? "bas" : "";
    return `<tr>
      <td><div class="nom">${echapper(x.nom)}</div>${x.reference ? `<div class="ref">${echapper(x.reference)}</div>` : ""}</td>
      <td>${echapper(categorie(x))}</td>
      <td class="n ${etat}">${formaterQuantite(q)} ${echapper(x.unite)}</td>
      <td class="n">${m(x.prix_vente)}</td>
      <td class="n">${m(x.prix_achat)}</td>
      <td class="n">${m(Math.max(0, q) * x.prix_achat)}</td>
    </tr>`;
  }).join("");

  const dateTexte = date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Liste des produits — ${echapper(p.nom_entreprise)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px; color: #1f2933;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 12px;
    border-bottom: 3px solid ${couleur}; margin-bottom: 14px; }
  .entreprise { display: flex; gap: 12px; align-items: center; }
  .entreprise img { max-height: 48px; max-width: 120px; object-fit: contain; }
  .entreprise .nom-e { font-size: 15px; font-weight: 700; }
  .entreprise .coord { color: #5b6670; font-size: 9.5px; }
  h1 { margin: 0; font-size: 18px; color: ${couleur}; text-align: right; }
  .date { color: #5b6670; text-align: right; margin-top: 2px; }
  .resume { display: flex; gap: 10px; margin-bottom: 14px; }
  .resume div { flex: 1; background: #f4f6f4; border-radius: 6px; padding: 8px 10px; }
  .resume .l { font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; color: #5b6670; }
  .resume .v { font-size: 13px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { background: ${couleur}; color: #fff; text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; padding: 7px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e3e7ea; vertical-align: top; }
  tr { break-inside: avoid; }
  .n { text-align: right; white-space: nowrap; }
  th.n { text-align: right; }
  .nom { font-weight: 600; }
  .ref { color: #8a949e; font-size: 9px; }
  .rupture { color: #c62828; font-weight: 700; }
  .bas { color: #b45309; font-weight: 700; }
  .pied { margin-top: 12px; color: #8a949e; font-size: 8.5px; text-align: center; }
</style></head>
<body>
  <div class="entete">
    <div class="entreprise">
      ${p.logo_url ? `<img src="${echapper(p.logo_url)}" alt="">` : ""}
      <div>
        <div class="nom-e">${echapper(p.nom_entreprise)}</div>
        <div class="coord">${[p.adresse, p.telephone, p.email].filter(Boolean).map(echapper).join(" · ")}</div>
      </div>
    </div>
    <div><h1>Liste des produits</h1><div class="date">${dateTexte}</div></div>
  </div>
  <div class="resume">
    <div><div class="l">Produits</div><div class="v">${produits.length}</div></div>
    <div><div class="l">En rupture</div><div class="v">${ruptures}</div></div>
    <div><div class="l">Valeur du stock (achat)</div><div class="v">${m(valeurAchat)}</div></div>
    <div><div class="l">Valeur du stock (vente)</div><div class="v">${m(valeurVente)}</div></div>
  </div>
  <table>
    <thead><tr><th>Produit</th><th>Catégorie</th><th class="n">Stock</th><th class="n">Prix de vente</th><th class="n">Prix d'achat</th><th class="n">Valeur stock</th></tr></thead>
    <tbody>${lignes || '<tr><td colspan="6" style="text-align:center;color:#8a949e;padding:20px">Aucun produit</td></tr>'}</tbody>
  </table>
  <div class="pied">Produits actifs · valeur du stock calculée au prix d'achat (stocks négatifs comptés à zéro) · FacturePlus</div>
</body></html>`;
}

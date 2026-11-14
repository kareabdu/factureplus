import type { SupabaseClient } from "@supabase/supabase-js";

import { traduireErreur } from "./erreurs";
import { LIBELLES_MODE_PAIEMENT, LIBELLES_TYPE_DOCUMENT, resteAPayer } from "./libelles";
import { formaterMontant, formaterQuantite } from "./montants";
import type { Document, LigneDocument, ModeleDocument, Parametres, Reglement } from "./types";

/**
 * Documents imprimables (facture, proforma, bon de livraison) en HTML autonome, format A4.
 * Mobile : expo-print le convertit en PDF ; web : impression du navigateur.
 *
 * Quatre modèles, tous déclinés dans la couleur de l'entreprise (parametres.couleur_document) :
 * même tableau d'articles et mêmes totaux, seul l'en-tête change.
 */

export const MODELES_DOCUMENT: { code: ModeleDocument; libelle: string; description: string }[] = [
  { code: "classique", libelle: "Classique", description: "Logo à gauche, numéro, dates et solde à droite" },
  { code: "bandeau", libelle: "Bandeau", description: "Client en haut à droite, informations sur une ligne" },
  { code: "client", libelle: "Client en avant", description: "Client à gauche, informations en colonne à droite" },
  { code: "moderne", libelle: "Moderne", description: "En-tête sur fond gris, titre en couleur" },
];

/** Couleurs proposées (la couleur reste libre : tout code #RRVVBB). */
export const COULEURS_DOCUMENT = [
  "#147A2E", "#65A30D", "#0E9384", "#0369A1", "#1D4ED8", "#6D28D9", "#BE185D", "#C2410C", "#B45309", "#334155",
];

export const estCouleurValide = (c: string | null | undefined): c is string => !!c && /^#[0-9A-Fa-f]{6}$/.test(c);

const echapper = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const multiligne = (s: string | null | undefined) => echapper(s).replace(/\n/g, "<br>");

const dateFr = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";

const TITRES: Record<Document["type"], string> = { facture: "Facture", proforma: "Proforma", bl: "Bon de livraison" };

export function htmlDocument(args: {
  document: Document;
  lignes: LigneDocument[];
  reglements?: Reglement[];
  parametres: Parametres;
  /** Aperçu d'un autre modèle / d'une autre couleur que ceux enregistrés */
  modele?: ModeleDocument;
  couleur?: string;
}): string {
  const { document: d, lignes, reglements = [], parametres: p } = args;
  const modele: ModeleDocument = args.modele ?? p.modele_document ?? "classique";
  const couleur = estCouleurValide(args.couleur) ? args.couleur : estCouleurValide(p.couleur_document) ? p.couleur_document : "#147A2E";
  const m = (v: number) => formaterMontant(v, p.symbole_devise);
  const estBL = d.type === "bl";
  const estFacture = d.type === "facture";
  const titre = TITRES[d.type];
  const numero = d.numero ?? "Brouillon";
  const annule = d.statut === "annule";

  // Montant mis en avant : solde dû (facture), total (proforma), rien (bon de livraison)
  const montantCle = estFacture ? resteAPayer(d) : d.total;
  const libelleMontantCle = estFacture ? "Solde dû" : "Total";
  // « Montant dû » : échéance, sinon conditions, sinon « Dû à réception »
  const conditions = d.echeance ? `Dû le ${dateFr(d.echeance)}`
    : d.conditions?.trim() ? d.conditions.trim().split("\n")[0].slice(0, 40) : "Dû à réception";

  // --- Blocs communs ----------------------------------------------------------
  const initiale = (p.nom_entreprise.trim()[0] ?? "S").toUpperCase();
  const logo = p.logo_url
    ? `<img class="logo" src="${echapper(p.logo_url)}" alt="">`
    : `<div class="logo logo-vide">${echapper(initiale)}</div>`;

  const telephones = [p.telephone, p.telephone2].filter(Boolean).map(echapper).join(" · ");
  const legal = [
    p.identifiant_fiscal && `N° fiscal : ${echapper(p.identifiant_fiscal)}`,
    p.ninea && `NINEA : ${echapper(p.ninea)}`,
    p.rccm && `RCCM : ${echapper(p.rccm)}`,
  ].filter(Boolean);
  const entreprise = (taille = "") => `
    <div class="entreprise">
      <div class="nom ${taille}">${echapper(p.nom_entreprise)}</div>
      ${p.adresse ? `<div>${echapper(p.adresse)}</div>` : ""}
      ${telephones ? `<div>${telephones}</div>` : ""}
      ${p.email ? `<div>${echapper(p.email)}</div>` : ""}
      ${legal.map((l) => `<div>${l}</div>`).join("")}
    </div>`;

  const client = (alignement = "") => `
    <div class="client ${alignement}">
      <div class="etiquette">${estBL ? "Adresse de livraison" : "Adresse de facturation"}</div>
      <div class="client-nom">${echapper(d.client_nom)}</div>
      ${d.client_telephone ? `<div>${echapper(d.client_telephone)}</div>` : ""}
      ${d.client_adresse ? `<div>${echapper(d.client_adresse)}</div>` : ""}
    </div>`;

  const info = (etiquette: string, valeur: string, classe = "") =>
    `<div class="info ${classe}"><div class="etiquette${classe.includes("accent") ? " accent" : ""}">${etiquette}</div><div class="valeur">${valeur}</div></div>`;

  const badgeAnnule = annule ? '<span class="annule">Annulé</span>' : "";

  // --- En-têtes selon le modèle -------------------------------------------------
  let entete: string;
  switch (modele) {
    case "bandeau":
      entete = `
        <div class="ligne-haut">
          <div class="identite">${logo}${entreprise()}</div>
          ${client("droite")}
        </div>
        <hr>
        <div class="bandeau">
          ${info(titre, `<strong>${echapper(numero)}</strong> ${badgeAnnule}`)}
          ${info("Date", dateFr(d.date))}
          ${estBL ? "" : info("Montant dû", echapper(conditions))}
          ${estBL ? "" : info(libelleMontantCle, m(montantCle), "droite accent montant-cle")}
        </div>`;
      break;
    case "client":
      entete = `
        <div class="ligne-haut">
          ${entreprise("grand")}
          ${logo}
        </div>
        <hr>
        <div class="ligne-haut espace-bas">
          ${client()}
          <div class="colonne-droite">
            ${info("Date", dateFr(d.date), "droite")}
            ${estBL ? "" : info("Montant dû", echapper(conditions), "droite")}
            ${info(titre, `<strong>${echapper(numero)}</strong> ${badgeAnnule}`, "droite")}
            ${estBL ? "" : info(libelleMontantCle, m(montantCle), "droite accent montant-cle")}
          </div>
        </div>`;
      break;
    case "moderne":
      entete = `
        <div class="fond-gris">
          <div class="ligne-haut">
            <div class="identite">${logo}${entreprise()}</div>
            <div class="droite">
              <div class="titre-couleur">${titre} ${badgeAnnule}</div>
              <div class="numero-moyen">${echapper(numero)}</div>
              <div class="petit">${dateFr(d.date)}</div>
              ${estFacture && d.echeance ? `<div class="petit">Éch. : ${dateFr(d.echeance)}</div>` : ""}
              ${estBL ? "" : `<div class="montant-cle accent">${m(montantCle)}</div>`}
            </div>
          </div>
        </div>
        ${client()}`;
      break;
    default: // classique
      entete = `
        <div class="ligne-haut">
          <div class="identite">${logo}${entreprise()}</div>
          <div class="colonne-droite">
            <div class="info droite"><div class="etiquette accent">${titre}</div><div class="numero-grand">${echapper(numero)} ${badgeAnnule}</div></div>
            ${info("Date", dateFr(d.date), "droite")}
            ${estFacture && d.echeance ? info("Échéance", dateFr(d.echeance), "droite") : ""}
            ${estBL ? "" : info(libelleMontantCle, m(montantCle), "droite accent montant-cle")}
          </div>
        </div>
        <hr>
        ${client()}`;
  }

  // --- Articles et totaux (communs) ---------------------------------------------
  const lignesHtml = lignes.map((l) => `
    <tr>
      <td>${echapper(l.designation)}${l.description ? `<div class="desc">${echapper(l.description)}</div>` : ""}</td>
      <td class="n">${formaterQuantite(l.quantite)}</td>
      <td>${echapper(l.unite ?? "")}</td>
      ${estBL ? "" : `<td class="n">${m(l.prix_unitaire)}</td><td class="n fort">${m(l.total ?? Math.round(l.prix_unitaire * l.quantite))}</td>`}
    </tr>`).join("");

  const avecTaxe = d.taxe_type !== "aucune" && Number(d.taxe_taux) > 0;
  const totaux = estBL ? "" : `
    <table class="totaux">
      <tr><td>Sous-total</td><td class="n">${m(d.sous_total)}</td></tr>
      ${avecTaxe ? `<tr><td>${echapper(d.taxe_nom)} ${String(d.taxe_taux).replace(".", ",")} %${d.taxe_incluse ? " (incluse)" : ""}</td><td class="n">${m(d.montant_taxe)}</td></tr>` : ""}
      <tr class="fort"><td>Total</td><td class="n">${m(d.total)}</td></tr>
      ${estFacture && d.montant_paye > 0 ? `<tr><td>Déjà payé</td><td class="n">${m(d.montant_paye)}</td></tr>` : ""}
      ${estFacture ? `<tr class="fort accent"><td>Solde dû</td><td class="n">${m(resteAPayer(d))}</td></tr>` : ""}
    </table>`;

  const reglementsHtml = estFacture && reglements.length ? `
    <div class="bloc"><div class="etiquette">Règlements</div>${reglements.map((r) =>
      `<div>${dateFr(r.date)} — ${LIBELLES_MODE_PAIEMENT[r.mode]} — ${m(r.montant)}${r.reference ? ` (${echapper(r.reference)})` : ""}</div>`).join("")}</div>` : "";

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(titre)} ${echapper(numero)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font-family: Helvetica, Arial, "Segoe UI", Roboto, sans-serif; color: #1f2933; font-size: 11px; line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { border-top: 4px solid ${couleur}; padding: 12mm 14mm 10mm; min-height: 100vh; display: flex; flex-direction: column; }
  .contenu { flex: 1; }
  hr { border: 0; border-top: 1px solid #e3e7ea; margin: 18px 0; }
  .accent { color: ${couleur} !important; }
  .etiquette { font-size: 8.5px; letter-spacing: .07em; text-transform: uppercase; color: #8a949e; margin-bottom: 2px; }
  .ligne-haut { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .identite { display: flex; gap: 14px; align-items: flex-start; }
  .logo { width: 64px; height: 64px; object-fit: contain; border-radius: 4px; flex-shrink: 0; }
  .logo-vide { background: ${couleur}; color: #fff; font-size: 32px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .entreprise { color: #5b6670; font-size: 10px; }
  .entreprise .nom { color: #1f2933; font-size: 14px; font-weight: 700; letter-spacing: .03em; }
  .entreprise .nom.grand { font-size: 17px; }
  .client { margin: 4px 0 22px; color: #5b6670; font-size: 10px; }
  .client.droite { text-align: right; margin: 0; }
  .client-nom { color: #1f2933; font-size: 13px; font-weight: 700; }
  .colonne-droite { display: flex; flex-direction: column; gap: 10px; }
  .droite { text-align: right; }
  .info .valeur { font-size: 12px; }
  .numero-grand { font-size: 17px; font-weight: 700; }
  .numero-moyen { font-size: 12px; font-weight: 700; }
  .montant-cle, .montant-cle .valeur { font-size: 15px; font-weight: 700; color: ${couleur}; }
  .bandeau { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .fond-gris { background: #f2f4f5; margin: -12mm -14mm 18px; padding: 12mm 14mm 14px; }
  .titre-couleur { color: ${couleur}; font-size: 20px; font-weight: 700; }
  .petit { font-size: 9.5px; color: #5b6670; }
  .annule { display: inline-block; font-size: 9px; font-weight: 700; color: #fff; background: #c0262d; border-radius: 3px; padding: 1px 6px; vertical-align: middle; text-transform: uppercase; }
  table.lignes { width: 100%; border-collapse: collapse; }
  table.lignes th { background: ${couleur}; color: #fff; text-align: left; padding: 7px 8px; font-size: 9px; letter-spacing: .06em; text-transform: uppercase; }
  table.lignes td { padding: 7px 8px; border-bottom: 1px solid #e3e7ea; vertical-align: top; }
  .n { text-align: right; white-space: nowrap; }
  table.lignes th.n { text-align: right; }
  .espace-bas { margin-bottom: 22px; }
  .fort { font-weight: 700; }
  .desc { color: #8a949e; font-size: 9.5px; margin-top: 2px; }
  table.totaux { margin: 12px 0 0 auto; width: 46%; border-collapse: collapse; border-bottom: 1px solid #e3e7ea; }
  table.totaux td { padding: 5px 0; text-transform: uppercase; font-size: 10px; }
  table.totaux td.n { text-transform: none; font-size: 11px; }
  .bloc { margin-top: 18px; color: #5b6670; }
  .signature { margin-top: 28px; text-align: right; color: #5b6670; }
  .signature img { max-height: 70px; }
  .pied { margin-top: 24px; font-size: 9px; color: #8a949e; text-align: center; }
</style></head>
<body><div class="page"><div class="contenu">
  ${entete}
  <table class="lignes">
    <thead><tr><th>Nom</th><th class="n">Qté</th><th>Unité</th>${estBL ? "" : '<th class="n">Prix</th><th class="n">Montant</th>'}</tr></thead>
    <tbody>${lignesHtml}</tbody>
  </table>
  ${totaux}
  ${reglementsHtml}
  ${d.conditions ? `<div class="bloc"><div class="etiquette">Conditions</div>${multiligne(d.conditions)}</div>` : ""}
  ${d.notes ? `<div class="bloc"><div class="etiquette">Notes</div>${multiligne(d.notes)}</div>` : ""}
  ${estBL ? '<div class="signature">Signature du client :<br><br><br></div>'
    : p.signature_url ? `<div class="signature"><img src="${echapper(p.signature_url)}" alt=""></div>` : ""}
</div>
  ${p.pied_facture || p.site_web ? `<div class="pied">${[multiligne(p.pied_facture), echapper(p.site_web)].filter(Boolean).join("<br>")}</div>` : ""}
</div></body></html>`;
}

/** Document fictif pour l'aperçu des modèles dans les paramètres. */
export function documentExemple(p: Parametres): { document: Document; lignes: LigneDocument[] } {
  const aujourdhui = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const lignes: LigneDocument[] = [
    { produit_id: null, designation: "Riz parfumé 25 kg", unite: "Sac", prix_unitaire: 15000, quantite: 2, taxable: true, total: 30000 },
    { produit_id: null, designation: "Huile 5 L", unite: "Pcs", prix_unitaire: 7000, quantite: 1, taxable: true, total: 7000 },
  ];
  const sous_total = 37000;
  const avecTaxe = p.taxe_type !== "aucune" && Number(p.taxe_taux) > 0;
  const montant_taxe = avecTaxe ? Math.round(sous_total * Number(p.taxe_taux) / 100) : 0;
  return {
    lignes,
    document: {
      id: "exemple", equipe_id: p.equipe_id, type: "facture", statut: "emis", numero: `${p.prefixe_facture}${aujourdhui.getFullYear()}-0001`,
      date: iso(aujourdhui), echeance: iso(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + 7)),
      client_id: null, client_nom: "Client exemple", client_telephone: "77 000 00 00", client_adresse: "Dakar",
      conditions: null, notes: null, taxe_type: p.taxe_type, taxe_nom: p.taxe_nom, taxe_taux: p.taxe_taux, taxe_incluse: false,
      sous_total, base_taxable: sous_total, montant_taxe, total: sous_total + montant_taxe, montant_paye: 0,
      source_id: null, valide_le: null, created_at: aujourdhui.toISOString(),
    },
  };
}

/** Message de partage (WhatsApp, SMS), avec le lien de téléchargement du PDF s'il est fourni. */
export function messagePartage(d: Document, p: Parametres, lienPdf?: string | null): string {
  const type = LIBELLES_TYPE_DOCUMENT[d.type];
  const montant = d.type === "bl" ? "" : ` d'un montant de ${formaterMontant(d.total, p.symbole_devise)}`;
  const message = `Bonjour ${d.client_nom}, voici votre ${type.toLowerCase()} ${d.numero ?? ""}${montant}.`;
  const pdf = lienPdf ? `\n\nTélécharger le PDF : ${lienPdf}` : "";
  return `${message}${pdf}\n\nMerci pour votre confiance. — ${p.nom_entreprise}`;
}

/** Durée de validité du lien de téléchargement envoyé au client. */
export const DUREE_LIEN_PDF_JOURS = 30;

/** Adresse du site web de FacturePlus (liens courts, pages publiques). */
export const SITE_WEB = "https://factureplus.kareapps.com";

/**
 * Dépose le PDF d'un document dans l'espace privé « documents » de l'équipe (remplace la version
 * précédente) et renvoie un lien court à envoyer au client : <site>/d/<code>, valable 30 jours,
 * redirigé par la fonction Edge « lien-pdf » vers le fichier.
 * Chemin : <equipe>/<document>/<numéro>.pdf — le nom téléchargé est le numéro du document.
 */
export async function lienPdfDocument(
  sb: SupabaseClient, d: Pick<Document, "id" | "equipe_id" | "numero" | "type">, contenu: ArrayBuffer | Blob,
): Promise<string> {
  const nom = (d.numero ?? `${LIBELLES_TYPE_DOCUMENT[d.type]}-brouillon`).replace(/[^\w.-]+/g, "-");
  const chemin = `${d.equipe_id}/${d.id}/${nom}.pdf`;
  const depot = await sb.storage.from("documents").upload(chemin, contenu, { contentType: "application/pdf", upsert: true });
  if (depot.error) throw new Error(traduireErreur(depot.error));
  const { data: code, error } = await sb.rpc("lien_court_document", { p_document: d.id, p_chemin: chemin, p_jours: DUREE_LIEN_PDF_JOURS });
  if (error || !code) throw new Error(traduireErreur(error ?? "Lien de téléchargement indisponible"));
  return `${SITE_WEB}/d/${code}`;
}

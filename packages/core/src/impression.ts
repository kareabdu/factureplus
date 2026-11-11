import { LIBELLES_MODE_PAIEMENT, LIBELLES_TYPE_DOCUMENT, resteAPayer } from "./libelles";
import { formaterMontant, formaterQuantite } from "./montants";
import type { Document, LigneDocument, Parametres, Reglement } from "./types";

/**
 * Document imprimable (facture, proforma, BL) en HTML autonome, format A4.
 * Mobile : expo-print le convertit en PDF ; web : fenêtre d'impression du navigateur.
 */

const echapper = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const dateFr = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR") : "");

export function htmlDocument(args: {
  document: Document;
  lignes: LigneDocument[];
  reglements?: Reglement[];
  parametres: Parametres;
}): string {
  const { document: d, lignes, reglements = [], parametres: p } = args;
  const m = (v: number) => formaterMontant(v, p.symbole_devise);
  const estBL = d.type === "bl";
  const titre = LIBELLES_TYPE_DOCUMENT[d.type] + (d.statut === "annule" ? " (ANNULÉE)" : "");
  const couleur = /^#[0-9A-Fa-f]{6}$/.test(p.couleur_document) ? p.couleur_document : "#0F766E";

  const coordonnees = [p.adresse, p.telephone, p.telephone2, p.email, p.site_web].filter(Boolean).map(echapper).join("<br>");
  const legal = [
    p.ninea && `NINEA : ${echapper(p.ninea)}`,
    p.rccm && `RCCM : ${echapper(p.rccm)}`,
    p.identifiant_fiscal && `NIF : ${echapper(p.identifiant_fiscal)}`,
  ].filter(Boolean).join(" · ");

  const lignesHtml = lignes.map((l) => `
    <tr>
      <td>${echapper(l.designation)}${l.description ? `<div class="desc">${echapper(l.description)}</div>` : ""}</td>
      <td class="n">${formaterQuantite(l.quantite)} ${echapper(l.unite ?? "")}</td>
      ${estBL ? "" : `<td class="n">${m(l.prix_unitaire)}</td><td class="n">${m(l.total ?? Math.round(l.prix_unitaire * l.quantite))}</td>`}
    </tr>`).join("");

  const totaux = estBL ? "" : `
    <table class="totaux">
      ${d.montant_taxe !== 0 || d.taxe_type !== "aucune" ? `<tr><td>Sous-total</td><td class="n">${m(d.sous_total)}</td></tr>
      <tr><td>${echapper(d.taxe_nom)} ${d.taxe_taux} %${d.taxe_incluse ? " (incluse)" : ""}</td><td class="n">${m(d.montant_taxe)}</td></tr>` : ""}
      <tr class="total"><td>Total</td><td class="n">${m(d.total)}</td></tr>
      ${d.type === "facture" && d.montant_paye > 0 ? `<tr><td>Déjà payé</td><td class="n">${m(d.montant_paye)}</td></tr>
      <tr class="reste"><td>Reste à payer</td><td class="n">${m(resteAPayer(d))}</td></tr>` : ""}
    </table>`;

  const reglementsHtml = d.type === "facture" && reglements.length ? `
    <div class="bloc"><strong>Règlements</strong><br>${reglements.map((r) =>
      `${dateFr(r.date)} — ${LIBELLES_MODE_PAIEMENT[r.mode]} — ${m(r.montant)}${r.reference ? ` (${echapper(r.reference)})` : ""}`).join("<br>")}</div>` : "";

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(titre)} ${echapper(d.numero ?? "")}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2933; font-size: 12px; margin: 0; }
  .entete { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid ${couleur}; padding-bottom: 12px; }
  .entreprise h1 { margin: 0 0 4px; font-size: 18px; color: ${couleur}; }
  .logo { max-height: 64px; max-width: 160px; margin-bottom: 6px; }
  .titre { text-align: right; }
  .titre h2 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
  .muted { color: #616e7c; }
  .parties { display: flex; justify-content: space-between; margin: 18px 0; gap: 24px; }
  .bloc { background: #f5f7fa; border-radius: 6px; padding: 10px 12px; margin-top: 12px; }
  table.lignes { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.lignes th { background: ${couleur}; color: #fff; text-align: left; padding: 8px; font-weight: 600; }
  table.lignes td { padding: 8px; border-bottom: 1px solid #e4e7eb; vertical-align: top; }
  .n { text-align: right; white-space: nowrap; }
  .desc { color: #616e7c; font-size: 11px; margin-top: 2px; }
  table.totaux { margin-left: auto; margin-top: 12px; min-width: 260px; border-collapse: collapse; }
  table.totaux td { padding: 6px 8px; }
  table.totaux .total td { font-weight: 700; font-size: 14px; border-top: 2px solid ${couleur}; }
  table.totaux .reste td { font-weight: 700; color: #b42318; }
  .pied { margin-top: 28px; font-size: 11px; color: #616e7c; text-align: center; border-top: 1px solid #e4e7eb; padding-top: 8px; }
  .signature { margin-top: 24px; text-align: right; }
  .signature img { max-height: 70px; }
</style></head>
<body>
  <div class="entete">
    <div class="entreprise">
      ${p.logo_url ? `<img class="logo" src="${echapper(p.logo_url)}" alt="">` : ""}
      <h1>${echapper(p.nom_entreprise)}</h1>
      <div class="muted">${coordonnees}</div>
    </div>
    <div class="titre">
      <h2>${echapper(titre)}</h2>
      <div><strong>${echapper(d.numero ?? "Brouillon")}</strong></div>
      <div class="muted">Date : ${dateFr(d.date)}</div>
      ${d.echeance && d.type === "facture" ? `<div class="muted">Échéance : ${dateFr(d.echeance)}</div>` : ""}
    </div>
  </div>
  <div class="parties">
    <div></div>
    <div class="bloc" style="min-width: 45%; margin-top: 0">
      <div class="muted">${d.type === "bl" ? "Livré à" : "Client"}</div>
      <strong>${echapper(d.client_nom)}</strong>
      ${d.client_telephone ? `<br>${echapper(d.client_telephone)}` : ""}
      ${d.client_adresse ? `<br>${echapper(d.client_adresse)}` : ""}
    </div>
  </div>
  <table class="lignes">
    <thead><tr><th>Désignation</th><th class="n">Quantité</th>${estBL ? "" : '<th class="n">Prix unitaire</th><th class="n">Montant</th>'}</tr></thead>
    <tbody>${lignesHtml}</tbody>
  </table>
  ${totaux}
  ${reglementsHtml}
  ${d.conditions ? `<div class="bloc"><strong>Conditions</strong><br>${echapper(d.conditions).replace(/\n/g, "<br>")}</div>` : ""}
  ${d.notes ? `<div class="bloc">${echapper(d.notes).replace(/\n/g, "<br>")}</div>` : ""}
  ${estBL ? '<div class="signature">Signature du client :<br><br><br></div>'
    : p.signature_url ? `<div class="signature"><img src="${echapper(p.signature_url)}" alt=""></div>` : ""}
  <div class="pied">${p.pied_facture ? `${echapper(p.pied_facture)}<br>` : ""}${legal}</div>
</body></html>`;
}

/** Message de partage (WhatsApp, SMS) accompagnant le PDF. */
export function messagePartage(d: Document, p: Parametres): string {
  const type = LIBELLES_TYPE_DOCUMENT[d.type];
  const montant = d.type === "bl" ? "" : ` d'un montant de ${formaterMontant(d.total, p.symbole_devise)}`;
  return `Bonjour ${d.client_nom}, voici votre ${type.toLowerCase()} ${d.numero ?? ""}${montant}. Merci pour votre confiance. — ${p.nom_entreprise}`;
}

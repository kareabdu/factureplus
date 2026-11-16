// Rappels d'abonnement par e-mail (fin d'essai ou d'abonnement proche, accès expiré).
// Appelée chaque jour par pg_cron (voir la migration rappels_abonnement), sans JWT : elle n'accepte aucune
// donnée ; reserver_rappels_abonnement (rôle service) choisit les destinataires et enregistre chaque rappel,
// si bien qu'un appel en double n'envoie rien deux fois. Envoi par l'API de Resend.
// Secrets : RESEND_API_KEY (obligatoire), EXPEDITEUR_EMAILS (facultatif).
import { clientService } from "../_shared/unitech.ts";

const SITE = "https://factureplus.kareapps.com";
const EXPEDITEUR = Deno.env.get("EXPEDITEUR_EMAILS") ?? "FacturePlus <noreply@factureplus.kareapps.com>";

interface Rappel {
  id: number;
  email: string;
  nom: string | null;
  type: "fin_proche" | "expire";
  etat: "essai" | "actif";
  fin: string;
}

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const dateFr = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Objet et contenu HTML du rappel. */
function message(r: Rappel): { objet: string; html: string } {
  const quoi = r.etat === "essai" ? "votre essai gratuit" : "votre abonnement";
  const date = dateFr(r.fin);
  const objet = r.type === "fin_proche"
    ? `FacturePlus : ${quoi} se termine le ${date}`
    : `FacturePlus : ${quoi} est terminé`;
  const texte = r.type === "fin_proche"
    ? `${quoi.charAt(0).toUpperCase()}${quoi.slice(1)} se termine le <strong>${date}</strong>. Pour continuer à créer vos factures, proformas et à gérer votre stock sans interruption, abonnez-vous depuis votre espace en ligne.`
    : `${quoi.charAt(0).toUpperCase()}${quoi.slice(1)} s'est terminé le <strong>${date}</strong>. Vos données sont conservées et restent consultables ; abonnez-vous pour pouvoir de nouveau créer et modifier vos documents.`;
  const bonjour = r.nom?.trim() ? `Bonjour ${echapper(r.nom.trim())},` : "Bonjour,";
  const html = `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2933;">
  <div style="padding: 24px 0; text-align: center;">
    <span style="display: inline-block; width: 40px; height: 40px; line-height: 40px; border-radius: 10px; background: #147A2E; color: #fff; font-size: 20px; font-weight: bold;">F+</span>
    <div style="margin-top: 8px; font-size: 20px; font-weight: bold;">Facture<span style="color: #147A2E;">Plus</span></div>
  </div>
  <p>${bonjour}</p>
  <p>${texte}</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${SITE}/abonnement" style="display: inline-block; background: #147A2E; color: #fff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 12px;">M'abonner (Wave ou Max It)</a>
  </p>
  <p>Mensuel ou annuel, paiement par Wave ou Orange Money (Max It) sur ${SITE.replace("https://", "")}. L'abonnement est valable aussitôt sur le site et dans l'application.</p>
  <p>Une question ? Écrivez-nous sur WhatsApp au +221 77 833 97 71 (français, wolof, anglais).</p>
  <p style="color: #8a949e; font-size: 12px; margin-top: 28px;">Vous recevez ce message car vous avez un compte FacturePlus. Pour ne plus recevoir ces rappels : Mon compte › Rappels par e-mail.</p>
</div>`;
  return { objet, html };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée" }, 405);
  const cle = Deno.env.get("RESEND_API_KEY");
  // Sans clé, on ne réserve rien : les rappels partiront au prochain passage
  if (!cle) return json({ erreur: "RESEND_API_KEY manquante" }, 500);

  const sb = clientService();
  const { data, error } = await sb.rpc("reserver_rappels_abonnement");
  if (error) return json({ erreur: error.message }, 500);
  const rappels = (data ?? []) as Rappel[];

  let envoyes = 0;
  const echecs: number[] = [];
  for (const r of rappels) {
    const { objet, html } = message(r);
    try {
      const rep = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EXPEDITEUR, to: [r.email], subject: objet, html }),
      });
      if (rep.ok) envoyes++;
      else {
        console.error("Resend :", rep.status, await rep.text());
        echecs.push(r.id);
      }
    } catch (e) {
      console.error("Envoi échoué :", (e as Error).message);
      echecs.push(r.id);
    }
  }
  // Échec : rappel retiré du journal, il repartira au prochain passage (tant que la date s'y prête)
  if (echecs.length) await sb.from("rappels_abonnement").delete().in("id", echecs);
  return json({ envoyes, echecs: echecs.length });
});

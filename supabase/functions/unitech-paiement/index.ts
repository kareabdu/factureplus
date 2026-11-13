// Lance le paiement d'un abonnement via Unitech Pay (Wave ou Orange Money Max It).
// Entrée : { plan: "mensuel" | "annuel", moyen: "wave" | "orange_maxit", telephone?, retour? }
// Sortie : { paiement_id, url_paiement, qr_code, liens } — l'application ouvre url_paiement.
// La confirmation arrive par le webhook (unitech-webhook) ou par unitech-verifier.
import {
  appelUnitech, cleUnitech, clientService, CORS, json, origineAutorisee, utilisateurConnecte,
} from "../_shared/unitech.ts";

const MOYENS = ["wave", "orange_maxit"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const sb = clientService();
    const user = await utilisateurConnecte(sb, req);
    if (!user) return json({ error: "Connexion requise" }, 401);

    const { plan, moyen, telephone, retour } = await req.json().catch(() => ({}));
    const { data: tarifs, error: erreurTarifs } = await sb.rpc("tarifs_abonnement");
    if (erreurTarifs) throw erreurTarifs;
    const tarif = (tarifs as { plan: string; montant: number }[]).find((t) => t.plan === plan);
    if (!tarif) return json({ error: "Plan invalide" }, 400);
    if (!MOYENS.includes(moyen)) return json({ error: "Moyen de paiement invalide" }, 400);
    const tel = typeof telephone === "string" ? telephone.replace(/[^\d+]/g, "").slice(0, 20) : "";

    const cle = cleUnitech();
    if (!cle) return json({ error: "Paiement indisponible pour le moment (Unitech Pay non configuré)." }, 503);

    const { data: paiement, error: erreurPaiement } = await sb.from("paiements_abonnement")
      .insert({ utilisateur_id: user.id, plan, montant: Number(tarif.montant), moyen, telephone: tel || null })
      .select("id").single();
    if (erreurPaiement) throw erreurPaiement;

    const base = Deno.env.get("SUPABASE_URL")!;
    // Webhook serveur à serveur (idempotent, au mieux : la vérification prend le relais)
    try {
      await appelUnitech("configure_webhook", cle, { webhook_url: `${base}/functions/v1/unitech-webhook` });
    } catch (e) {
      console.log("configure_webhook :", (e as Error).message);
    }

    // Retour après paiement : site web autorisé, sinon l'application (factureplus://)
    const cible = origineAutorisee(retour) ?? "app";
    const urlRetour = (etat: string) =>
      `${base}/functions/v1/unitech-retour?etat=${etat}&cible=${encodeURIComponent(cible)}`;
    const description = `Abonnement FacturePlus ${plan === "annuel" ? "annuel" : "mensuel"}`;
    const corps = {
      amount: Number(tarif.montant),
      customer_number: tel,
      description,
      callback_success: urlRetour("succes"),
      callback_cancel: urlRetour("annule"),
    };
    const reponse = await appelUnitech(moyen === "wave" ? "create_wave_payment" : "create_orange_maxit", cle, corps);
    console.log("Unitech Pay", moyen, JSON.stringify(reponse).slice(0, 1000));

    if (!reponse?.success) {
      await sb.rpc("marquer_paiement_abonnement", { p_paiement: paiement.id, p_statut: "echoue" });
      return json({ error: reponse?.message || reponse?.error || "Paiement refusé par Unitech Pay" }, 400);
    }

    const tx = reponse.data ?? {};
    await sb.from("paiements_abonnement").update({
      reference: tx.reference ? String(tx.reference) : null,
      transaction_id: tx.transaction_id != null ? String(tx.transaction_id) : null,
    }).eq("id", paiement.id);

    return json({
      paiement_id: paiement.id,
      url_paiement: tx.payment_url || tx.payment_link || tx.checkout_url || tx.url || null,
      qr_code: tx.qr_code || null,
      liens: tx.deep_links || null,
    });
  } catch (e) {
    console.error("unitech-paiement :", e);
    return json({ error: (e as Error).message ?? "Erreur inattendue" }, 500);
  }
});

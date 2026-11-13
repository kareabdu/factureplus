// Notification serveur à serveur d'Unitech Pay. Signature obligatoire :
// en-tête x-unitechpay-signature = HMAC-SHA256 (hex) du corps brut avec la clé marchand.
// Déployée sans vérification de JWT (appelée par Unitech Pay).
import { clientService, cleUnitech, estEchoue, estPaye, json, montantTransaction } from "../_shared/unitech.ts";

async function hmac(cle: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(cle), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function egalConstant(a: string, b: string): boolean {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  try {
    const cle = cleUnitech();
    if (!cle) return json({ error: "Clé non configurée" }, 500);
    const corps = await req.text();
    const signature = req.headers.get("x-unitechpay-signature") ?? "";
    if (!signature || !egalConstant(signature, await hmac(cle, corps))) {
      return json({ error: "Signature invalide" }, 401);
    }

    let evenement: Record<string, any>;
    try {
      evenement = JSON.parse(corps);
    } catch {
      return json({ error: "Contenu invalide" }, 400);
    }
    const obj = evenement.data ?? evenement;
    const reference = obj.reference ? String(obj.reference) : "";
    const transaction = obj.transaction_id != null ? String(obj.transaction_id) : "";
    const type = String(evenement.event ?? obj.event ?? "").toLowerCase();
    if (!reference && !transaction) return json({ recu: true });

    const sb = clientService();
    let paiement: { id: string; statut: string } | null = null;
    if (reference) {
      paiement = (await sb.from("paiements_abonnement").select("id, statut").eq("reference", reference).maybeSingle()).data;
    }
    if (!paiement && transaction) {
      paiement = (await sb.from("paiements_abonnement").select("id, statut").eq("transaction_id", transaction).maybeSingle()).data;
    }
    if (!paiement) return json({ recu: true, inconnu: true });
    if (paiement.statut === "paye") return json({ recu: true, deja: true });

    if (estPaye(obj.status) || /success|paid|completed/.test(type)) {
      const { error } = await sb.rpc("activer_paiement_abonnement", {
        p_paiement: paiement.id, p_montant_recu: montantTransaction(obj), p_transaction: transaction || null,
      });
      if (error) {
        console.log("webhook : activation refusée", paiement.id, error.message);
        return json({ recu: true, refuse: true });
      }
    } else if (estEchoue(obj.status) || /fail|cancel|expired/.test(type)) {
      await sb.rpc("marquer_paiement_abonnement", { p_paiement: paiement.id, p_statut: "echoue" });
    }
    return json({ recu: true });
  } catch (e) {
    console.error("unitech-webhook :", e);
    return json({ error: (e as Error).message ?? "Erreur inattendue" }, 500);
  }
});

// Vérifie auprès d'Unitech Pay les paiements en attente de l'utilisateur connecté et active
// l'abonnement dès qu'une transaction réussie correspond (filet de secours du webhook).
// Sortie : { actif: boolean, en_attente: number }
import {
  appelUnitech, cleUnitech, clientService, CORS, estEchoue, estPaye, json, montantTransaction, utilisateurConnecte,
} from "../_shared/unitech.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const sb = clientService();
    const user = await utilisateurConnecte(sb, req);
    if (!user) return json({ error: "Connexion requise" }, 401);

    const { data: attente, error } = await sb.from("paiements_abonnement")
      .select("id, montant, reference, transaction_id, created_at")
      .eq("utilisateur_id", user.id).eq("statut", "en_attente")
      .gte("created_at", new Date(Date.now() - 2 * 86_400_000).toISOString())
      .order("created_at", { ascending: false }).limit(5);
    if (error) throw error;
    if (!attente?.length) return json({ actif: false, en_attente: 0 });

    const cle = cleUnitech();
    if (!cle) return json({ actif: false, en_attente: attente.length });

    const brut = await appelUnitech("transactions", cle);
    const liste: Record<string, unknown>[] =
      Array.isArray(brut) ? brut
      : Array.isArray(brut?.data) ? brut.data
      : Array.isArray(brut?.data?.transactions) ? brut.data.transactions
      : Array.isArray(brut?.data?.data) ? brut.data.data
      : Array.isArray(brut?.transactions) ? brut.transactions
      : [];

    let actif = false;
    let restants = 0;
    for (const p of attente) {
      const t = liste.find((x) => {
        const ref = String(x.reference ?? x.ref ?? "");
        const id = String(x.transaction_id ?? x.id ?? "");
        return (p.reference && ref === p.reference) || (p.transaction_id && id === p.transaction_id);
      });
      const statut = t?.status ?? t?.statut ?? t?.Statut;
      if (t && estPaye(statut)) {
        const { error: e } = await sb.rpc("activer_paiement_abonnement", {
          p_paiement: p.id, p_montant_recu: montantTransaction(t), p_transaction: String(t.transaction_id ?? t.id ?? ""),
        });
        if (e) console.log("activation refusée", p.id, e.message);
        else actif = true;
      } else if (t && estEchoue(statut)) {
        await sb.rpc("marquer_paiement_abonnement", { p_paiement: p.id, p_statut: "echoue" });
      } else {
        restants++;
      }
    }
    return json({ actif, en_attente: restants });
  } catch (e) {
    console.error("unitech-verifier :", e);
    return json({ error: (e as Error).message ?? "Erreur inattendue" }, 500);
  }
});

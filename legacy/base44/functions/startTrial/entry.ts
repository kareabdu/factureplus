import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

// Fixe le statut d'essai côté serveur pour l'utilisateur courant.
// Remplace l'écriture client (updateMe) qui permettait à un utilisateur de
// fixer arbitrairement subscription_status. N'écrit que "trial" et ne
// dégrade jamais un abonnement déjà actif.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Ne jamais écraser un abonnement actif ou un essai déjà persisté.
    if (user.subscription_status === "active") {
      return Response.json({ ok: false, reason: "already_active" });
    }
    if (user.trial_end_date) {
      return Response.json({ ok: false, reason: "already_persisted" });
    }

    // trial_end_date est calculé côté serveur à partir de la date de création
    // de l'utilisateur. La valeur fournie par le client est ignorée : un
    // utilisateur ne peut pas fixer une date d'essai arbitraire (bypass de
    // paiement). Borné à created_date + 14 jours.
    const TRIAL_DAYS = 14;
    const created = user.created_date ? new Date(user.created_date) : new Date();
    const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 86400000);
    const trialEndStr = trialEnd.toISOString();

    await base44.asServiceRole.entities.User.update(user.id, {
      subscription_status: "trial",
      trial_end_date: trialEndStr,
    });
    return Response.json({ ok: true, subscription_status: "trial", trial_end_date: trialEndStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
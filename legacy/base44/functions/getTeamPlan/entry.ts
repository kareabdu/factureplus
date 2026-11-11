import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Hiérarchie des plans : annual > monthly > weekly > essential
const PLAN_RANK = { essential: 0, weekly: 1, monthly: 2, annual: 3 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let teamId = user.team_id;
    if (!teamId) {
      teamId = user.id;
    }

    const all = await base44.asServiceRole.entities.User.list("-created_date", 500);
    const members = all.filter((u) => u.team_id === teamId);

    // Vérification côté serveur : un statut "active" n'est trusted que s'il est
    // adossé à un SubscriptionPayment en statut "paid". Cela neutralise les
    // auto-activations client (updateMe) qui écriraient subscription_status
    // sans paiement réel.
    const paid = await base44.asServiceRole.entities.SubscriptionPayment.filter({
      status: "paid",
    }, "-created_date", 500);
    const paidUserIds = new Set((paid || []).map((p) => p.user_id));
    const isActiveBacked = (u) =>
      u.subscription_status === "active" && !!u.subscription_plan && paidUserIds.has(u.id);

    const owner = members.find((u) => u.id === teamId);
    if (isActiveBacked(owner)) {
      return Response.json({ team_id: teamId, effective_plan: owner.subscription_plan, owner_plan: true });
    }

    // À défaut d'un abonnement propriétaire, on conserve le meilleur plan actif
    // parmi les autres membres (compatibilité rétroactive).
    let bestPlan = null;
    let bestRank = -1;
    for (const m of members) {
      if (m.id === teamId) continue;
      if (isActiveBacked(m)) {
        const r = PLAN_RANK[m.subscription_plan] ?? -1;
        if (r > bestRank) {
          bestRank = r;
          bestPlan = m.subscription_plan;
        }
      }
    }

    return Response.json({ team_id: teamId, effective_plan: bestPlan, owner_plan: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
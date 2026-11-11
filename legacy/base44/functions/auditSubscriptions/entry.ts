import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { PLAN_DURATIONS } from "../../shared/subscription.ts";

const DAY_MS = 86400000;

// Audit admin : liste les utilisateurs dont l'abonnement est en réalité
// expiré alors que leur statut client est "active" (passeraient le contrôle
// si TrialGate trustait subscription_status). Sert à mesurer l'ampleur de
// la faille et à surveiller les abonnements mal clôturés.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (caller.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const today = new Date().toISOString().split("T")[0];

    const all = await base44.asServiceRole.entities.User.list("-created_date", 500);
    const users = (all || []).filter((u) => u.role !== "admin");

    const paid = await base44.asServiceRole.entities.SubscriptionPayment.filter(
      { status: "paid" },
      "-created_date",
      500
    );
    const paidItems = paid || [];

    // user_id -> date de fin valide la plus récente (période non expirée)
    const validByUser: Record<string, { plan: string; end_date: string }> = {};
    for (const p of paidItems) {
      const days = PLAN_DURATIONS[p.plan] || 30;
      const end = new Date(new Date(p.created_date).getTime() + days * DAY_MS);
      if (end >= new Date(today)) {
        validByUser[p.user_id] = { plan: p.plan, end_date: end.toISOString().split("T")[0] };
      }
    }

    const flagged: any[] = [];
    for (const u of users) {
      const status = u.subscription_status || "none";
      const endDate = u.subscription_end_date || null;
      const hasValidPaid = !!validByUser[u.id] || !!validByUser[u.team_id];
      // On ne désactive QUE si la date stockée est passée ET qu'aucun paiement
      // valide en cours ne soutient l'abonnement (vérifié via user_id et team_id).
      // Cela évite de désactiver un abonnement semestriel/annuel dont la date
      // stockée serait mal mise à jour mais le paiement réel toujours valide.
      const expiredActive = status === "active" && (!endDate || endDate < today) && !hasValidPaid;
      const activeNotBacked = status === "active" && !hasValidPaid;
      if (expiredActive || activeNotBacked) {
        flagged.push({
          id: u.id,
          email: u.email,
          plan: u.subscription_plan,
          end_date: endDate,
          expired_active: expiredActive,
          active_not_backed: activeNotBacked,
        });
      }
    }

    const expiredActiveFull = flagged.filter((f) => f.expired_active);

    // Mode correctif : on passe les abonnements réellement expirés à "expired".
    let fix = false;
    try {
      const body = await req.clone().json();
      fix = !!body?.fix;
    } catch { /* no body */ }
    let fixedCount = 0;
    if (fix) {
      for (const u of expiredActiveFull) {
        try {
          await base44.asServiceRole.entities.User.update(u.id, { subscription_status: "expired" });
          fixedCount++;
        } catch (e) {
          /* ignore single failure */
        }
      }
    }

    const expiredActive = expiredActiveFull.map((f) => ({ email: f.email, end_date: f.end_date, plan: f.plan }));
    const activeNotBacked = flagged.filter((f) => !f.expired_active).map((f) => ({ email: f.email, end_date: f.end_date, plan: f.plan }));
    return Response.json({
      today,
      total_users_audited: users.length,
      total_paid_payments: paidItems.length,
      flagged_count: flagged.length,
      expired_active_count: expiredActive.length,
      expired_active: expiredActive,
      active_not_backed_count: activeNotBacked.length,
      active_not_backed: activeNotBacked,
      fixed_count: fixedCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
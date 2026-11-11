import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { computeEndDate, PLAN_AMOUNTS } from "../../shared/subscription.ts";

// Back-office only: active/désactive un abonnement pour un utilisateur.
// Aucune écriture d'abonnement n'est plus déclenchée côté client ; cette
// fonction est l'unique point d'entrée légitime (avec les fonctions de
// paiement UnitechPay) pour fixer subscription_status = "active".
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (caller.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const payload = await req.json();
    const userId = payload?.user_id;
    const status = payload?.status; // "active" | "expired" | "none"
    const plan = payload?.plan; // "monthly" | "semestriel" | "annual" | "none"
    const endDate = payload?.end_date; // ISO string | null

    if (!userId || typeof userId !== "string") {
      return Response.json({ error: "user_id requis" }, { status: 400 });
    }
    const allowedStatus = ["active", "expired", "none"];
    if (!allowedStatus.includes(status)) {
      return Response.json({ error: "statut invalide" }, { status: 400 });
    }

    const update: any = { subscription_status: status };
    if (status === "active") {
      const allowedPlans = ["monthly", "semestriel", "annual"];
      if (!allowedPlans.includes(plan)) {
        return Response.json({ error: "plan invalide" }, { status: 400 });
      }
      update.subscription_plan = plan;
      update.subscription_start_date = new Date().toISOString().split("T")[0];
      update.subscription_end_date = endDate || computeEndDate(plan, new Date());
    } else {
      update.subscription_plan = plan || "none";
      update.subscription_end_date = endDate ?? null;
    }

    await base44.asServiceRole.entities.User.update(userId, update);

    // Trace d'audit : toute activation manuelle par l'admin crée un
    // SubscriptionPayment "paid" (méthode admin) afin que la vérification
    // côté serveur (getTeamPlan) puisse confirmer que le statut "active"
    // est adossé à un paiement enregistré.
    if (status === "active") {
      await base44.asServiceRole.entities.SubscriptionPayment.create({
        user_id: userId,
        plan,
        amount: PLAN_AMOUNTS[plan] ?? 0,
        method: "admin",
        reference: `admin-${caller.id}-${Date.now()}`,
        status: "paid",
        description: `Activation manuelle par ${caller.email || caller.id}`,
      });
    }

    return Response.json({ ok: true, user_id: userId, ...update });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
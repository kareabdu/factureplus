import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { PLAN_DURATIONS } from "../../shared/subscription.ts";

// Période d'essai : cohérente avec src/lib/trial.js
const EXISTING_TRIAL_END = new Date("2026-08-31T23:59:59");
const NEW_USER_CUTOFF = new Date("2026-08-10T00:00:00");
const NEW_USER_TRIAL_DAYS = 14;
const DAY_MS = 86400000;

function computeTrialEnd(user): Date {
  if (user.trial_end_date) return new Date(user.trial_end_date);
  const created = new Date(user.created_date);
  if (created >= NEW_USER_CUTOFF) {
    return new Date(created.getTime() + NEW_USER_TRIAL_DAYS * DAY_MS);
  }
  return new Date(EXISTING_TRIAL_END);
}

// Vérification SERVEUR de l'abonnement effectif de l'utilisateur courant.
// Ne truste PAS user.subscription_status (champ client modifiable via updateMe) :
// seul un SubscriptionPayment "paid" dont la période calculée n'est pas
// expirée active l'accès. Neutralise les auto-activations client et les
// statuts "active" oubliés en base après expiration.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role === "admin") {
      return Response.json({ active: true, is_admin: true, plan: null, end_date: null });
    }

    let teamId = user.team_id || user.id;

    const paid = await base44.asServiceRole.entities.SubscriptionPayment.filter(
      { user_id: user.id, status: "paid" },
      "-created_date",
      500
    );
    const userPaid = paid || [];

    const now = new Date();
    let active = false;
    let plan: string | null = null;
    let endDate: Date | null = null;

    // Chaque utilisateur (propriétaire ou membre) doit avoir son PROPRE
    // abonnement actif. L'abonnement du propriétaire ne couvre pas les membres.
    for (const p of userPaid) {
      const start = new Date(p.created_date || now);
      const days = PLAN_DURATIONS[p.plan] || 30;
      const end = new Date(start.getTime() + days * DAY_MS);
      if (end >= now) {
        active = true;
        if (!endDate || end > endDate) {
          endDate = end;
          plan = p.plan;
        }
      }
    }

    // Auto-réparation : le statut stocké peut rester "active" alors que la
    // période payée est terminée. On le réaligne sur la réalité des paiements.
    if (!active && user.subscription_status === "active") {
      await base44.asServiceRole.entities.User.update(user.id, {
        subscription_status: "expired",
      });
    }

    const trialEnd = computeTrialEnd(user);
    const inTrial = trialEnd >= now;

    return Response.json({
      active,
      is_admin: false,
      plan,
      end_date: endDate ? endDate.toISOString().split("T")[0] : null,
      trial_end_date: trialEnd.toISOString(),
      in_trial: inTrial,
      blocked: !active && !inTrial,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
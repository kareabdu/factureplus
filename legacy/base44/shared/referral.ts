// Logique de parrainage partagée entre les fonctions backend de paiement.
// Commission fixe par plan d'abonnement souscrit par le filleul :
//   - mensuel   : 200
//   - semestriel: 500
//   - annuel    : 1000
// Plafond global de 100 000 de commissions cumulées par parrain.

export const REFERRAL_COMMISSIONS = { monthly: 200, semestriel: 500, annual: 1000 };
export const COMMISSION_CAP = 100000;

export function getCommissionForPlan(plan) {
  return REFERRAL_COMMISSIONS[plan] || 0;
}

export async function processReferralCommission(base44, { userId, amount, plan }) {
  try {
    if (!userId) return { commissioned: false, reason: "no_user" };

    const user = await base44.asServiceRole.entities.User.get(userId);
    if (!user) return { commissioned: false, reason: "no_user" };

    const code = user.referred_by_code;
    if (!code) return { commissioned: false, reason: "no_referrer" };

    const referrers = await base44.asServiceRole.entities.User.filter({ referral_code: code });
    const referrer = referrers && referrers[0];
    if (!referrer) return { commissioned: false, reason: "referrer_not_found" };
    if (referrer.id === userId) return { commissioned: false, reason: "self_referral" };

    const commissionAmount = getCommissionForPlan(plan);

    // Évite de commissionner deux fois le même filleul.
    const existing = await base44.asServiceRole.entities.Referral.filter({
      referred_user_id: userId,
    });
    if (existing && existing.length) {
      const rec = existing[0];
      if (rec.status === "commissioned") {
        return { commissioned: false, reason: "already_commissioned" };
      }
      // Met à jour le parrainage "pending" créé à l'inscription.
      await base44.asServiceRole.entities.Referral.update(rec.id, {
        status: "commissioned",
        commission_amount: commissionAmount,
        plan,
        commissioned_date: new Date().toISOString().split("T")[0],
      });
      return { commissioned: true, commission_amount: commissionAmount };
    }

    // Plafond de 100 000 de commissions cumulées par parrain.
    const commissioned = await base44.asServiceRole.entities.Referral.filter({
      referrer_id: referrer.id,
      status: "commissioned",
    });
    const alreadyEarned = (commissioned || []).reduce(
      (s, r) => s + (r.commission_amount || 0),
      0
    );
    if (alreadyEarned + commissionAmount > COMMISSION_CAP) {
      return { commissioned: false, reason: "cap_reached" };
    }

    await base44.asServiceRole.entities.Referral.create({
      referrer_id: referrer.id,
      referrer_email: referrer.email,
      referred_user_id: userId,
      referred_email: user.email,
      referral_code: code,
      status: "commissioned",
      payment_status: "pending",
      commission_amount: commissionAmount,
      plan,
      commissioned_date: new Date().toISOString().split("T")[0],
    });

    return { commissioned: true, commission_amount: commissionAmount };
  } catch (error) {
    console.error("processReferralCommission error:", error);
    return { commissioned: false, reason: "error", error: error.message };
  }
}
import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Crée un enregistrement de parrainage "pending" dès l'inscription du filleul,
// afin que le parrain voie le filleul apparaître dans sa liste immédiatement.
// La commission est calculée plus tard, lors de la souscription à un abonnement
// (voir processReferralCommission dans base44/shared/referral.ts).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { code } = await req.json();
    if (!code) return Response.json({ ok: false, reason: "no_code" });

    if (user.referred_by_code && user.referred_by_code !== code) {
      // déjà rattaché à un autre parrain
      return Response.json({ ok: false, reason: "already_referred" });
    }

    const referrers = await base44.asServiceRole.entities.User.filter({ referral_code: code });
    const referrer = referrers && referrers[0];
    if (!referrer) return Response.json({ ok: false, reason: "referrer_not_found" });
    if (referrer.id === user.id) return Response.json({ ok: false, reason: "self_referral" });

    // Évite un doublon : un filleul ne peut avoir qu'un seul parrainage.
    const existing = await base44.asServiceRole.entities.Referral.filter({
      referred_user_id: user.id,
    });
    if (existing && existing.length) {
      return Response.json({ ok: true, reason: "exists" });
    }

    await base44.asServiceRole.entities.Referral.create({
      referrer_id: referrer.id,
      referrer_email: referrer.email,
      referred_user_id: user.id,
      referred_email: user.email,
      referral_code: code,
      status: "pending",
      payment_status: "pending",
      commission_amount: 0,
      team_id: referrer.team_id || null,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
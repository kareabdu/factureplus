import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Rattrapage one-shot : crée les parrainages "pending" manquants pour les
// utilisateurs déjà inscrits avec un code de parrainage avant la mise en place
// de la création automatique à l'inscription (registerReferral).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Admin uniquement" }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list("-created_date", 1000);
    const existing = await base44.asServiceRole.entities.Referral.list("-created_date", 1000);
    const referredIds = new Set(existing.map((r) => r.referred_user_id));

    // Index des parrains par code de parrainage.
    const referrerByCode = new Map();
    for (const u of users) {
      if (u.referral_code) referrerByCode.set(u.referral_code, u);
    }

    let created = 0;
    let skipped = 0;
    const missing = [];

    for (const u of users) {
      if (!u.referred_by_code) continue;
      if (referredIds.has(u.id)) { skipped++; continue; }

      const referrer = referrerByCode.get(u.referred_by_code);
      if (!referrer) { missing.push({ email: u.email, code: u.referred_by_code, reason: "referrer_not_found" }); continue; }
      if (referrer.id === u.id) { missing.push({ email: u.email, code: u.referred_by_code, reason: "self_referral" }); continue; }

      await base44.asServiceRole.entities.Referral.create({
        referrer_id: referrer.id,
        referrer_email: referrer.email,
        referred_user_id: u.id,
        referred_email: u.email,
        referral_code: u.referred_by_code,
        status: "pending",
        payment_status: "pending",
        commission_amount: 0,
        team_id: referrer.team_id || null,
      });
      created++;
    }

    return Response.json({ created, skipped, missing });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
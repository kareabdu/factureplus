import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const plan = payload?.plan;
    const allowedPlans = ['essential', 'monthly', 'semestriel', 'annual'];
    if (!allowedPlans.includes(plan)) {
      return Response.json({ error: 'Plan invalide' }, { status: 400 });
    }

    // Only "pending" is ever set from the client flow.
    // "active"/"trial"/"expired" are granted solely by admins (SubscriptionsAdmin).
    await base44.asServiceRole.entities.User.update(user.id, {
      subscription_status: 'pending',
      subscription_plan: plan,
    });

    return Response.json({ subscription_status: 'pending', subscription_plan: plan });
  } catch (error) {
    console.error('requestSubscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
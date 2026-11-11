import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Suppression « douce » : le compte est désactivé mais récupérable en se
    // reconnectant dans les 30 jours. Au-delà, la suppression devient définitive
    // (voir resolveAccountRecovery).
    await base44.asServiceRole.entities.User.update(user.id, {
      deleted_at: new Date().toISOString(),
    });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
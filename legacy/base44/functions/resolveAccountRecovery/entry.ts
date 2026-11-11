import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const deletedAt = user.deleted_at || user.data?.deleted_at;
    if (!deletedAt) return Response.json({ status: 'active' });

    const elapsed = Date.now() - new Date(deletedAt).getTime();
    if (elapsed < THIRTY_DAYS_MS) {
      // Fenêtre de récupération : on réactive le compte.
      await base44.asServiceRole.entities.User.update(user.id, { deleted_at: null });
      return Response.json({ status: 'restored' });
    }

    // Délai dépassé : suppression définitive.
    await base44.asServiceRole.entities.User.delete(user.id);
    return Response.json({ status: 'expired' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
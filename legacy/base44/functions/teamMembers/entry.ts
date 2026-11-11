import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let teamId = user.team_id;
    if (!teamId) {
      teamId = user.id;
      // Écriture côté serveur uniquement (asServiceRole) : ne fixe team_id qu'à
      // l'id de l'utilisateur lui-même, jamais à une équipe arbitraire.
      await base44.asServiceRole.entities.User.update(user.id, { team_id: teamId });
    }

    const all = await base44.asServiceRole.entities.User.list("-created_date", 500);
    const members = all.filter((u) => u.team_id === teamId);
    return Response.json({ team_id: teamId, members });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
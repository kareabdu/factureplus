import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    if (user.team_id !== user.id && user.role !== "admin") {
      return Response.json({ error: "Seul le propriétaire de l'équipe peut retirer un membre." }, { status: 403 });
    }

    const { memberId } = await req.json();
    if (!memberId) return Response.json({ error: "memberId requis" }, { status: 400 });

    const teamId = user.team_id || user.id;
    if (memberId === user.id) {
      return Response.json({ error: "Vous ne pouvez pas vous retirer de votre propre équipe." }, { status: 400 });
    }

    const member = await base44.asServiceRole.entities.User.get(memberId);
    if (!member || member.team_id !== teamId) {
      return Response.json({ error: "Ce membre n'appartient pas à votre équipe." }, { status: 404 });
    }

    await base44.asServiceRole.entities.User.update(memberId, { team_id: null });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
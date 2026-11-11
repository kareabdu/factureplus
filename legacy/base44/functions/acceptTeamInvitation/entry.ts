import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

// Accepte une invitation à rejoindre une équipe. L'invité doit être
// authentifié et son e-mail doit correspondre à l'invitation. Le jeton
// est vérifié côté serveur — aucun rattachement ne se fait sans acceptation
// explicite de l'invité.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return Response.json({ error: "Token requis" }, { status: 400 });
    }

    const invitations = await base44.asServiceRole.entities.TeamInvitation.filter({
      token, status: "pending"
    });
    const invitation = invitations && invitations[0];
    if (!invitation) {
      return Response.json({ error: "Invitation invalide ou expirée" }, { status: 404 });
    }

    // Vérifie l'expiration.
    if (invitation.expires_date) {
      const exp = new Date(invitation.expires_date);
      if (exp < new Date()) {
        await base44.asServiceRole.entities.TeamInvitation.update(invitation.id, { status: "expired" });
        return Response.json({ error: "Invitation expirée" }, { status: 410 });
      }
    }

    // L'invité authentifié doit correspondre à l'e-mail de l'invitation.
    const userEmail = String(user.email || "").trim().toLowerCase();
    if (invitation.invitee_email !== userEmail) {
      return Response.json({ error: "Cette invitation ne vous est pas destinée" }, { status: 403 });
    }

    // Ne rattache pas un utilisateur déjà membre d'une autre équipe.
    if (user.team_id && user.team_id !== user.id && user.team_id !== invitation.team_id) {
      return Response.json({ error: "Vous appartenez déjà à une équipe" }, { status: 403 });
    }
    if (user.team_id === invitation.team_id) {
      await base44.asServiceRole.entities.TeamInvitation.update(invitation.id, { status: "accepted" });
      return Response.json({ ok: true, already: true, team_id: invitation.team_id });
    }

    await base44.asServiceRole.entities.User.update(user.id, { team_id: invitation.team_id });
    await base44.asServiceRole.entities.TeamInvitation.update(invitation.id, { status: "accepted" });

    return Response.json({ ok: true, team_id: invitation.team_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
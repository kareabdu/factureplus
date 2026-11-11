import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Échappe le HTML pour éviter l'injection de contenu forgé (phishing) dans
// les e-mails d'invitation. Réutilise la même logique que notifySubscriptionRequest.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Génère un jeton d'invitation cryptographiquement aléatoire.
function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Propriétaire = pas de team_id (solo) ou team_id === id.
    if (user.team_id && user.team_id !== user.id && user.role !== "admin") {
      return Response.json({ error: "Seul le propriétaire de l'équipe peut inviter." }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) return Response.json({ error: "Email requis" }, { status: 400 });
    const normalizedEmail = String(email).trim().toLowerCase();

    const teamId = user.team_id || user.id;

    // Vérifie qu'il n'existe pas déjà une invitation en attente pour cet
    // e-mail vers cette équipe. Si oui, on renvoie un succès sans recréer.
    const existing = await base44.asServiceRole.entities.TeamInvitation.filter({
      invitee_email: normalizedEmail, team_id: teamId, status: "pending"
    });
    if (existing && existing.length > 0) {
      return Response.json({ success: true, message: "Invitation déjà en attente" });
    }

    // Crée une invitation avec jeton (consentement requis). Le rattachement
    // effectif ne se fait que lorsque l'invité accepte via acceptTeamInvitation.
    // Aucun utilisateur n'est rattaché à l'équipe sans acceptation explicite.
    const token = generateToken();
    const expires = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    await base44.asServiceRole.entities.TeamInvitation.create({
      team_id: teamId,
      inviter_id: user.id,
      inviter_name: user.full_name || user.email,
      invitee_email: normalizedEmail,
      token,
      status: "pending",
      expires_date: expires,
    });

    // Envoie un e-mail à l'invité avec le lien d'acceptation.
    const url = new URL(req.url);
    const acceptLink = `${url.origin}/AcceptInvitation?token=${token}`;
    const inviterName = escapeHtml(user.full_name || user.email);
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: normalizedEmail,
        subject: `Invitation à rejoindre l'équipe de ${user.full_name || user.email} sur StockTracker`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #07a43f;">Invitation à rejoindre une équipe</h2>
            <p><strong>${inviterName}</strong> vous invite à rejoindre son équipe sur StockTracker.</p>
            <p>Vous pourrez alors partager ses factures, devis, articles et stock.</p>
            <p style="margin: 24px 0;">
              <a href="${acceptLink}" style="background: #07a43f; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accepter l'invitation</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Ce lien expire le ${expires}. Si vous n'avez pas encore de compte, inscrivez-vous d'abord avec cette adresse e-mail, puis cliquez sur le lien.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("teamInvite email error:", err.message);
    }

    return Response.json({ success: true, message: "Invitation envoyée à " + normalizedEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import { EMAIL_SIGNATURE_HTML } from '../../shared/emailSignature.ts';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Limitation de débit : max 3 demandes par 10 minutes par utilisateur,
    // pour empêcher le spam récurrent vers toutes les adresses admin.
    const recent = await base44.asServiceRole.entities.SubscriptionPayment.filter({ user_id: user.id });
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = (recent || []).filter(p => p.created_date && new Date(p.created_date) > tenMinAgo).length;
    if (recentCount >= 3) {
      return Response.json({ error: 'Trop de demandes récentes. Réessayez plus tard.' }, { status: 429 });
    }

    // Ignore les données fournies par le client (payload.data) : la
    // notification est construite exclusivement à partir de l'utilisateur
    // authentifié, pour empêcher l'usurpation d'identité du demandeur.
    const payload = await req.json().catch(() => ({}));
    const planLabel = payload?.data?.subscription_plan === 'annual' ? 'Annuel' : 'Mensuel';
    const subscriberName = user.full_name || user.email || 'Un utilisateur';
    const safeName = escapeHtml(subscriberName);
    const safeEmail = escapeHtml(user.email || '—');
    const safeSubjectName = escapeHtml(subscriberName);

    // Get all admins to notify
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin');

    for (const admin of admins) {
      if (!admin.email) continue;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `Nouvelle demande d'abonnement - ${safeSubjectName}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">Nouvelle demande d'abonnement</h2>
              <p>Un utilisateur a demandé un abonnement :</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Utilisateur</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Email</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${safeEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Plan demandé</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${planLabel}</td>
                </tr>
              </table>
              <p style="color: #6b7280; font-size: 14px;">
                Connectez-vous à l'administration pour approuver ou refuser cette demande.
              </p>
              ${EMAIL_SIGNATURE_HTML}
            </div>
          `,
        });
      } catch (err) {
        console.error('Failed to email admin:', admin.email, err.message);
      }
      // Notification push native vers l'admin
      waitUntil(
        base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: admin.id,
          title: "Demande d'abonnement",
          content: `${subscriberName} — Plan ${planLabel}`,
          action_label: "Voir",
          action_url: "/SubscriptionsAdmin",
        }).catch((e) => console.error("push failed:", admin.id, e.message))
      );
    }

    return Response.json({ message: 'Notifications envoyées', admins_notified: admins.length });
  } catch (error) {
    console.error('notifySubscriptionRequest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
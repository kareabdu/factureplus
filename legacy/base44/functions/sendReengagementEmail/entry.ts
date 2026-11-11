import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
const DEFAULT_APP_URL = 'https://invoice.kareapps.com';

function buildMessage(email: string, appUrl: string): string {
  return [
    "Bonjour,<br><br>",
    "Nous avons le plaisir de vous confirmer que votre compte <b>StockTracker</b> est prêt à l'emploi.<br><br>",
    "Vous n'avez pas encore eu l'occasion de vous connecter ? C'est le moment idéal pour découvrir tout ce que notre plateforme peut faire pour votre activité.<br><br>",
    "Conçu pour les professionnels, <b>StockTracker</b> centralise et simplifie votre gestion au quotidien :<br>",
    "&nbsp;&nbsp;• Suivi de stock en temps réel, par emplacement<br>",
    "&nbsp;&nbsp;• Création de factures, devis et bons de livraison<br>",
    "&nbsp;&nbsp;• Tableau de bord des ventes et des performances<br>",
    "&nbsp;&nbsp;• Gestion complète de vos clients et fournisseurs<br><br>",
    "Que vous soyez au bureau, en déplacement ou sur le terrain, retrouvez toutes vos données à portée de main, à tout moment.<br><br>",
    "👉 Connectez-vous dès maintenant pour prendre en main votre compte :<br>",
    `<a href="${appUrl}/login">${appUrl}/login</a><br><br>`,
    "Vous souhaitez être accompagné(e) pour vos premiers pas ?<br>",
    "Notre équipe est à votre écoute :<br>",
    `&nbsp;&nbsp;• WhatsApp : <a href="https://wa.me/221778339771">Cliquez ici pour discuter</a><br>`,
    `&nbsp;&nbsp;• E-mail : <a href="mailto:applikare@gmail.com">applikare@gmail.com</a><br><br>`,
    "Nous restons à votre entière disposition et vous souhaitons une excellente expérience sur <b>StockTracker</b>.<br><br>",
    "Cordialement,<br>",
    "<b>L'équipe StockTracker</b><br>",
    "📞 +221 77 833 97 71<br>",
    `✉️ <a href="mailto:applikare@gmail.com">applikare@gmail.com</a><br>`,
    `🌐 <a href="https://invoice.kareapps.com">invoice.kareapps.com</a>`
  ].join("");
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const emails: string[] = Array.isArray(body?.emails) ? body.emails : [];
    const appUrl = (body?.app_url || DEFAULT_APP_URL).replace(/\/$/, '');
    const subject = 'Votre compte StockTracker est prêt ! 🚀';

    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];
    for (const e of emails) {
      const addr = String(e || '').trim();
      if (!addr) continue;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: addr,
          subject,
          body: buildMessage(addr, appUrl),
        });
        sent.push(addr);
      } catch (err) {
        failed.push({ email: addr, error: err?.message || String(err) });
      }
    }
    return Response.json({ sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { EMAIL_SIGNATURE_TEXT } from '../../shared/emailSignature.ts';

const DEFAULT_APP_URL = 'https://invoice.kareapps.com';

function buildMessage(email: string, appUrl: string): string {
  return `Bonjour,

Vous avez commencé votre inscription sur StockTracker mais celle-ci n'est pas encore finalisée.

StockTracker vous permet de gérer votre stock, vos factures, vos clients et vos bons de livraison en quelques clics — où que vous soyez.

Il ne vous reste qu'une étape : confirmer votre adresse e-mail pour activer votre compte.

Reprenez votre inscription ici : ${appUrl}/register

Besoin d'aide ? Contactez-nous sur WhatsApp : https://wa.me/221778339771 ou par e-mail : support@kareapps.com

À très vite sur StockTracker.
${EMAIL_SIGNATURE_TEXT}`;
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
    const subject = 'Finalisez votre inscription sur StockTracker 🚀';

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
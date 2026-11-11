import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import { computeEndDate, PLAN_AMOUNTS, PLAN_LABELS } from '../../shared/subscription.ts';
import { processReferralCommission } from '../../shared/referral.ts';

async function hmacSha256(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = Deno.env.get('UNITECH_API_KEY');

    const payload = await req.text();
    const signature = req.headers.get('x-unitechpay-signature') || '';

    // Vérification de signature obligatoire : toute requête sans clé API ou
    // sans en-tête de signature est rejetée. Sans cela, un attaquant anonyme
    // pouvait forger un payload "paid" sans en-tête et activer des abonnements
    // sans paiement réel.
    if (!apiKey) return Response.json({ error: 'Clé non configurée' }, { status: 500 });
    if (!signature) return Response.json({ error: 'Signature manquante' }, { status: 401 });
    const expected = await hmacSha256(apiKey, payload);
    if (!safeEqual(signature, expected)) {
      return Response.json({ error: 'Signature invalide' }, { status: 401 });
    }

    let event;
    try { event = JSON.parse(payload); } catch {
      return Response.json({ error: 'Payload invalide' }, { status: 400 });
    }

    const obj = event.data || event;
    const reference = obj.reference || '';
    const transactionId = String(obj.transaction_id || '');
    const status = String(obj.status || '').toLowerCase();
    const eventType = String(event.event || obj.event || '').toLowerCase();

    if (!reference && !transactionId) return Response.json({ received: true });

    // Recherche du paiement en attente par référence, puis par transaction_id.
    let payment = null;
    if (reference) {
      const m = await base44.asServiceRole.entities.SubscriptionPayment.filter({ reference });
      payment = m && m[0];
    }
    if (!payment && transactionId) {
      const m = await base44.asServiceRole.entities.SubscriptionPayment.filter({ transaction_id: transactionId });
      payment = m && m[0];
    }
    if (!payment) return Response.json({ received: true, unmatched: true });
    if (payment.status === 'paid') return Response.json({ received: true, already: true });

    const isPaid = status === 'paid' || status === 'success' || status === 'completed' || status === 'successful' ||
      /success|paid|completed/.test(eventType);
    const isFailed = /fail|cancel|expired|error/.test(status) || /fail|cancel|expired/.test(eventType);

    if (isPaid) {
      // Contrôle du montant : la transaction webhook doit correspondre au prix
      // du plan demandé. Rejette tout paiement partiel ou référence réutilisée.
      const expected = PLAN_AMOUNTS[payment.plan] ?? 0;
      const txAmount = Number(
        obj.amount ?? obj.Amount ?? obj.montant ?? obj.Montant ??
        obj.value ?? obj.total ?? obj.price ?? 0
      );
      if (expected > 0 && (!txAmount || txAmount < expected)) {
        console.log('webhook amount mismatch for payment', payment.id, ': got', txAmount, 'expected', expected);
        return Response.json({ received: true, amount_mismatch: true });
      }
      const now = new Date();
      const endDate = computeEndDate(payment.plan, now);
      await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
        status: 'paid',
        transaction_id: transactionId || payment.transaction_id,
      });
      await base44.asServiceRole.entities.User.update(payment.user_id, {
        subscription_status: 'active',
        subscription_plan: payment.plan,
        subscription_start_date: now.toISOString().split('T')[0],
        subscription_end_date: endDate,
      });
      await processReferralCommission(base44, { userId: payment.user_id, amount: payment.amount, plan: payment.plan });

      // Notification push vers tous les admins
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = allUsers.filter((u) => u.role === 'admin');
      const planLabel = PLAN_LABELS[payment.plan] || payment.plan;
      for (const admin of admins) {
        waitUntil(
          base44.asServiceRole.integrations.Core.SendPushNotification({
            user_id: admin.id,
            title: "Abonnement activé",
            content: `${payment.user_email || payment.user_id} — ${planLabel}`,
            action_label: "Voir",
            action_url: "/SubscriptionsAdmin",
          }).catch((e) => console.error("push failed:", admin.id, e.message))
        );
      }
    } else if (isFailed) {
      await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, { status: 'failed' });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('unitechWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
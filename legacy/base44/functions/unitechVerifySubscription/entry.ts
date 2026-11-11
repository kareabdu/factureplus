import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { computeEndDate, PLAN_AMOUNTS, MEMBER_PLAN_AMOUNTS } from '../../shared/subscription.ts';
import { processReferralCommission } from '../../shared/referral.ts';

const API_BASE = 'https://api.unitech.sn/api';

const SUCCESS_STATUSES = ['paid', 'success', 'completed', 'successful', 'done'];

function isSuccessful(status) {
  const s = String(status || '').toLowerCase();
  return SUCCESS_STATUSES.includes(s) || /success|paid|completed|valid/i.test(s);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('UNITECH_API_KEY');
    if (!apiKey) return Response.json({ error: 'Clé UnitechPay non configurée' }, { status: 500 });

    // Récupère les paiements en attente de cet utilisateur (plus récent d'abord).
    const pending = await base44.asServiceRole.entities.SubscriptionPayment.filter({
      user_id: user.id,
      status: 'pending',
    }, '-created_date', 5);

    if (!pending || pending.length === 0) {
      return Response.json({ verified: false, reason: 'no_pending' });
    }

    // Liste les transactions depuis UnitechPay.
    const resp = await fetch(API_BASE + '?action=transactions', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + apiKey },
    });
    const raw = await resp.json();
    console.log('transactions response status:', resp.status);
    console.log('transactions response:', JSON.stringify(raw).slice(0, 3000));

    let list = [];
    if (Array.isArray(raw)) list = raw;
    else if (Array.isArray(raw.data)) list = raw.data;
    else if (raw.data && Array.isArray(raw.data.transactions)) list = raw.data.transactions;
    else if (raw.data && Array.isArray(raw.data.data)) list = raw.data.data;
    else if (Array.isArray(raw.transactions)) list = raw.transactions;
    console.log('transactions list length:', list.length, 'first item:', JSON.stringify(list[0] || {}).slice(0, 800));

    let activated = null;
    for (const payment of pending) {
      const match = list.find((t) => {
        const ref = t.reference || t.Référence || t.ref || '';
        const tid = String(t.transaction_id || t.id || '');
        return (payment.reference && ref === payment.reference) ||
               (payment.transaction_id && tid === payment.transaction_id);
      });

      if (!match) continue;

      const status = match.status || match.Statut || match.statut || '';
      if (isSuccessful(status)) {
        // Contrôle du montant : la transaction doit correspondre au prix du
        // plan demandé. Rejette toute transaction dont le montant est inférieur
        // (paiement partiel, référence réutilisée, autre produit du marchand).
        const expected = payment.is_team_member
          ? (MEMBER_PLAN_AMOUNTS[payment.plan] ?? PLAN_AMOUNTS[payment.plan] ?? 0)
          : (PLAN_AMOUNTS[payment.plan] ?? 0);
        const txAmount = Number(
          match.amount ?? match.Amount ?? match.montant ?? match.Montant ??
          match.value ?? match.total ?? match.price ?? 0
        );
        if (expected > 0 && (!txAmount || txAmount < expected)) {
          console.log('amount mismatch for payment', payment.id, ': got', txAmount, 'expected', expected);
          continue;
        }
        const now = new Date();
        const endDate = computeEndDate(payment.plan, now);
        await base44.asServiceRole.entities.SubscriptionPayment.update(payment.id, {
          status: 'paid',
        });
        await base44.asServiceRole.entities.User.update(payment.user_id, {
          subscription_status: 'active',
          subscription_plan: payment.plan,
          subscription_start_date: now.toISOString().split('T')[0],
          subscription_end_date: endDate,
        });
        await processReferralCommission(base44, { userId: payment.user_id, amount: payment.amount, plan: payment.plan });
        activated = payment;
        break;
      }
    }

    if (activated) {
      return Response.json({ verified: true, plan: activated.plan });
    }
    return Response.json({ verified: false, reason: 'not_completed_yet' });
  } catch (error) {
    console.error('unitechVerifySubscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
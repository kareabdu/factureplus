import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { PLAN_AMOUNTS, MEMBER_PLAN_AMOUNTS, isTeamMember } from '../../shared/subscription.ts';

const API_BASE = 'https://api.unitech.sn/api';
const VALID_PLANS = ['weekly', 'monthly', 'annual'];
const VALID_METHODS = ['wave', 'orange_qr', 'orange_maxit'];

// Construit l'URL de base à partir de l'URL de la requête serveur (non contrôlable
// par le client). On n'utilise JAMAIS les en-têtes Origin/Referer fournis par le
// client, car un attaquant authentifié pourrait rediriger le webhook global
// UnitechPay vers un domaine externe et détourner les notifications de paiement.
function resolveBaseUrl(req) {
  try {
    const u = new URL(req.url);
    if (u.hostname) return u.origin;
  } catch {}
  return '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan, method, phone, return_origin } = await req.json();
    if (!VALID_PLANS.includes(plan)) return Response.json({ error: 'Plan invalide' }, { status: 400 });
    if (!VALID_METHODS.includes(method)) return Response.json({ error: 'Méthode invalide' }, { status: 400 });

    // Utilise l'origine fournie par le client (domaine personnalisé) pour les
    // redirections utilisateur (success/cancel). Le webhook serveur-à-serveur
    // utilise toujours l'URL de la requête pour des raisons de sécurité.
    const clientOrigin = (typeof return_origin === 'string' && return_origin.startsWith('https://'))
      ? return_origin.replace(/\/+$/, '')
      : '';
    const baseUrl = resolveBaseUrl(req);
    if (!baseUrl) return Response.json({ error: 'Origine non autorisée' }, { status: 400 });
    const redirectBase = clientOrigin || baseUrl;

    const apiKey = Deno.env.get('UNITECH_API_KEY');
    if (!apiKey) return Response.json({ error: 'Clé UnitechPay non configurée' }, { status: 500 });

    // Configure le webhook UnitechPay (idempotent) afin de recevoir les confirmations
    // de paiement serveur-à-serveur. Sans cela, le client est débité mais l'abonnement
    // n'est jamais renouvelé. Best-effort : n'empêche pas le paiement en cas d'échec.
    const webhookUrl = baseUrl + '/functions/unitechWebhook';
    try {
      const cw = await fetch(API_BASE + '?action=configure_webhook', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
      console.log('configure_webhook:', cw.status, await cw.text());
    } catch (e) {
      console.log('configure_webhook best-effort failed:', e.message);
    }

    // Tarif membre d'équipe : si l'utilisateur est un membre (et non le
    // propriétaire) et que le propriétaire a un abonnement actif, on facture
    // le tarif réduit membre. Sinon, on facture le tarif plein propriétaire.
    const member = isTeamMember(user);
    let amount = PLAN_AMOUNTS[plan];
    let isTeamMemberRate = false;
    if (member) {
      // Vérifie si le propriétaire de l'équipe a un abonnement actif et payé.
      const teamId = user.team_id;
      const owner = await base44.asServiceRole.entities.User.get(teamId);
      const paidOwner = await base44.asServiceRole.entities.SubscriptionPayment.filter({
        user_id: teamId,
        status: 'paid',
      }, '-created_date', 1);
      const ownerActive = owner?.subscription_status === 'active' && !!owner?.subscription_plan &&
        (paidOwner || []).length > 0;
      if (ownerActive) {
        amount = MEMBER_PLAN_AMOUNTS[plan] ?? PLAN_AMOUNTS[plan];
        isTeamMemberRate = true;
      }
    }
    const description = isTeamMemberRate
      ? 'Abonnement StockTracker - Membre équipe (' + plan + ')'
      : 'Abonnement StockTracker - Plan ' + plan;
    const successUrl = redirectBase + '/Subscription?payment=success';
    const cancelUrl = redirectBase + '/Subscription?payment=cancel';

    let action, body;
    if (method === 'wave') {
      action = 'create_wave_payment';
      body = { amount, customer_number: phone || '', description, callback_success: successUrl, callback_cancel: cancelUrl };
    } else if (method === 'orange_qr') {
      action = 'create_orange_qr';
      body = { amount, reference: 'sub_' + user.id + '_' + Date.now(), description, callback_success: successUrl, callback_cancel: cancelUrl };
    } else {
      action = 'create_orange_maxit';
      body = { amount, customer_number: phone || '', description, callback_success: successUrl, callback_cancel: cancelUrl };
    }

    const resp = await fetch(API_BASE + '?action=' + action, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    console.log('UnitechPay response [' + action + ']:', JSON.stringify(data));

    if (!data.success) {
      return Response.json({ error: data.message || data.error || 'Erreur UnitechPay' }, { status: 400 });
    }

    const tx = data.data || {};
    // Extraction robuste de l'URL de paiement (plusieurs noms de champs possibles).
    const paymentUrl = tx.payment_url || tx.payment_link || tx.url || tx.checkout_url || '';
    await base44.asServiceRole.entities.SubscriptionPayment.create({
      user_id: user.id,
      user_email: user.email,
      plan,
      amount,
      is_team_member: isTeamMemberRate,
      method,
      reference: tx.reference || '',
      transaction_id: String(tx.transaction_id || ''),
      status: 'pending',
      team_id: user.team_id || '',
    });

    // Marque l'abonnement en attente de confirmation de paiement.
    await base44.asServiceRole.entities.User.update(user.id, {
      subscription_status: 'pending',
      subscription_plan: plan,
    });

    return Response.json({
      method,
      payment_url: paymentUrl,
      qr_code: tx.qr_code || '',
      deep_links: tx.deep_links || null,
      reference: tx.reference || '',
    });
  } catch (error) {
    console.error('unitechCreateSubscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
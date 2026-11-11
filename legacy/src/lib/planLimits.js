import { Invoice } from "@/entities/all";
import { base44 } from "@/api/base44Client";

const PLAN_RANK = { monthly: 2, semestriel: 3, annual: 4 };

// Cache du meilleur plan actif parmi les membres de l'équipe (annuel lève
// les restrictions pour tous les membres si le propriétaire ou un membre s'abonne).
let _teamPlanCache = null;
let _teamOwnerPlanCache = null;
let _teamPlanPromise = null;

export async function loadTeamPlan(user) {
  if (!user) return null;
  if (user.role === "admin") return null;
  // Plus de court-circuit basé sur subscription_status côté client : le plan
  // effectif est toujours vérifié côté serveur (getTeamPlan) pour neutraliser
  // les auto-activations client (updateMe).
  if (_teamPlanPromise) return _teamPlanPromise;
  _teamPlanPromise = (async () => {
    try {
      const res = await base44.functions.invoke("getTeamPlan", {});
      _teamPlanCache = res?.data?.effective_plan || null;
      _teamOwnerPlanCache = !!res?.data?.owner_plan;
      return _teamPlanCache;
    } catch {
      _teamPlanCache = null;
      _teamOwnerPlanCache = false;
      return null;
    } finally {
      _teamPlanPromise = null;
    }
  })();
  return _teamPlanPromise;
}

// Retourne true si le propriétaire de l'équipe a un abonnement actif.
// Permet d'afficher le tarif membre réduit sur la page d'abonnement.
export async function loadTeamMemberInfo(user) {
  if (!user || user.role === "admin") return { owner_has_plan: false };
  await loadTeamPlan(user);
  return { owner_has_plan: _teamOwnerPlanCache };
}

export function clearTeamPlanCache() {
  _teamPlanCache = null;
  _teamPlanPromise = null;
}

// Plan effectif = plan vérifié côté serveur (getTeamPlan). On ne trust plus
// user.subscription_plan (modifiable côté client) : seul _teamPlanCache,
// alimenté par la fonction backend, fait foi.
function getEffectivePlan() {
  return _teamPlanCache;
}

// Limites associées à chaque plan d'abonnement.
// null = illimité / activé. Les administrateurs et la période d'essai ne sont pas limités.
export const PLAN_LIMITS = {
  monthly: { invoice_limit: null, bl_enabled: true, inventory_enabled: true, team_enabled: true, activity_enabled: true, name: "Mensuel" },
  semestriel: { invoice_limit: null, bl_enabled: true, inventory_enabled: true, team_enabled: true, activity_enabled: true, name: "Semestriel" },
  annual: { invoice_limit: null, bl_enabled: true, inventory_enabled: true, team_enabled: true, activity_enabled: true, name: "Annuel" },
};

export const PLAN_LABEL = { monthly: "Mensuel", semestriel: "Semestriel", annual: "Annuel" };

export function getPlanLimits(user) {
  if (!user) return null;
  if (user.role === "admin") return null;
  // L'utilisateur doit avoir son propre abonnement actif — l'abonnement
  // du propriétaire ne couvre pas les membres de l'équipe.
  if (user.subscription_status !== "active") return null;
  const plan = getEffectivePlan();
  if (!plan) return null;
  return PLAN_LIMITS[plan] || null;
}

export function isBlEnabled(user) {
  const l = getPlanLimits(user);
  return l ? l.bl_enabled : true;
}

export function isInventoryEnabled(user) {
  const l = getPlanLimits(user);
  return l ? l.inventory_enabled : true;
}

export function isTeamEnabled(user) {
  const l = getPlanLimits(user);
  return l ? l.team_enabled : true;
}

export function isActivityEnabled(user) {
  const l = getPlanLimits(user);
  return l ? l.activity_enabled : true;
}

export function getInvoiceLimit(user) {
  const l = getPlanLimits(user);
  return l ? l.invoice_limit : null;
}

export async function countInvoices() {
  const list = await Invoice.filter({ type: "invoice" }, "-created_date", 500);
  return Array.isArray(list) ? list.length : 0;
}

// Retourne { ok, count, limit } — ok=false si la limite est atteinte.
// Ne charge que limit+1 factures au lieu de toutes (gain majeur quand
// l'utilisateur a des centaines de factures).
export async function canCreateInvoice(user) {
  const limit = getInvoiceLimit(user);
  if (limit == null) return { ok: true, limit: null, count: null };
  const list = await Invoice.filter({ type: "invoice" }, "-created_date", limit + 1);
  const count = Array.isArray(list) ? list.length : 0;
  return { ok: count < limit, count, limit };
}
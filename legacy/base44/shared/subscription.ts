// Configuration partagée des abonnements — utilisée par les fonctions backend
// UnitechPay et cohérente avec la page Subscription.

// Tarifs propriétaire (licence principale)
export const PLAN_AMOUNTS = { monthly: 2900, annual: 29000 };
export const PLAN_DURATIONS = { monthly: 30, semestriel: 180, annual: 365 }; // jours (semestriel conservé pour les abonnements existants)
export const PLAN_LABELS = { monthly: "Mensuel", annual: "Annuel" };

// Tarifs membre additionnel (réduction équipe : le propriétaire paye la licence
// principale, chaque membre paye une licence réduite pour le même forfait).
export const MEMBER_PLAN_AMOUNTS = { monthly: 1500, annual: 17000 };
export const MEMBER_PLAN_LABELS = { monthly: "Mensuel", annual: "Annuel" };

// Détermine si l'utilisateur est un membre d'équipe (et non le propriétaire).
// Le propriétaire est celui dont l'id === team_id.
export function isTeamMember(user) {
  return !!user && user.role !== "admin" && !!user.team_id && user.id !== user.team_id;
}

// Retourne le montant à facturer selon le statut (membre ou propriétaire).
export function getPlanAmount(plan, isMember) {
  return isMember ? (MEMBER_PLAN_AMOUNTS[plan] ?? PLAN_AMOUNTS[plan]) : PLAN_AMOUNTS[plan];
}

export function computeEndDate(plan, startDate) {
  const days = PLAN_DURATIONS[plan] || 30;
  const end = new Date(startDate);
  end.setDate(end.getDate() + days);
  return end.toISOString().split("T")[0];
}
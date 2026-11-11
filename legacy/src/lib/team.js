import { base44 } from "@/api/base44Client";

let _teamId = null;
let _me = null;

// Cache de l'utilisateur courant pour la session. AuthContext le pré-remplit
// au démarrage (setMe) ; tous les composants utilisent getMe() au lieu de
// rappeler base44.auth.me() (un aller-retour réseau à chaque montage).
export async function getMe() {
  if (_me) return _me;
  try {
    _me = await base44.auth.me();
    return _me;
  } catch {
    return null;
  }
}

export function setMe(user) {
  if (user) _me = user;
}

export function clearMe() {
  _me = null;
  _teamId = null;
}

export async function getTeamId() {
  if (_teamId) return _teamId;
  const me = await getMe();
  _teamId = me?.team_id || me?.id || null;
  return _teamId;
}

export function clearTeamCache() {
  _teamId = null;
}

// Un utilisateur est propriétaire de son équipe s'il n'a pas de team_id
// (utilisateur solo) ou si son team_id correspond à son propre id.
// Les membres d'une équipe (team_id != id) ne sont pas propriétaires.
export function isTeamOwner(user) {
  if (!user) return false;
  return !user.team_id || user.team_id === user.id;
}
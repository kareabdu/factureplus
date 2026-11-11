import { Settings } from "@/entities/all";
import { getTeamId } from "@/lib/team";

// Cache court (30s) des paramètres d'équipe pour éviter les rechargements
// répétés lors de l'ouverture/fermeture de l'éditeur de documents.
let _settingsCache = null;
let _settingsCacheAt = 0;
const SETTINGS_TTL = 30000;

export function clearTeamSettingsCache() {
  _settingsCache = null;
  _settingsCacheAt = 0;
}

/**
 * Récupère les paramètres (Settings) du propriétaire de l'équipe, afin que la
 * numérotation des documents soit identique pour tous les membres d'une même équipe.
 *
 * - Propriétaire : team_id == son propre id → renvoie son enregistrement.
 * - Membre : team_id == id du propriétaire → on filtre par created_by_id pour
 *   obtenir l'enregistrement créé par le propriétaire (et non un éventuel
 *   enregistrement divergent créé par le membre).
 */
export async function getTeamSettings() {
  if (_settingsCache && Date.now() - _settingsCacheAt < SETTINGS_TTL) {
    return _settingsCache;
  }
  const teamId = await getTeamId();
  try {
    if (!teamId) {
      const all = await Settings.list();
      _settingsCache = all[0] || null;
    } else {
      const byOwner = await Settings.filter({ created_by_id: teamId });
      if (byOwner && byOwner.length > 0) {
        _settingsCache = byOwner[0];
      } else {
        const byTeam = await Settings.filter({ team_id: teamId });
        _settingsCache = (byTeam && byTeam[0]) || null;
      }
    }
    _settingsCacheAt = Date.now();
    return _settingsCache;
  } catch (e) {
    console.warn("getTeamSettings: échec réseau, retour null", e?.message);
    return null;
  }
}
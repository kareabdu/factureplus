import { base44 } from "@/api/base44Client";
import { getTeamId } from "@/lib/team";

let _me = null;
async function getMe() {
  if (!_me) {
    try { _me = await base44.auth.me(); } catch { _me = null; }
  }
  return _me;
}

export async function getUserName() {
  const me = await getMe();
  return me?.full_name || me?.email || "";
}

export async function logActivity({ action_type, entity_type, entity_id = "", description = "", metadata = {} }) {
  try {
    const me = await getMe();
    await base44.entities.ActivityLog.create({
      action_type,
      entity_type,
      entity_id,
      description,
      metadata,
      user_name: me?.full_name || me?.email || "",
      team_id: await getTeamId(),
    });
  } catch (e) {
    /* la journalisation ne doit jamais bloquer l'action */
  }
}
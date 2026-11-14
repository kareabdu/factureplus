// Web : pas de notifications push (l'application mobile seule les reçoit).

export async function activerNotifications() {}
export async function desactiverNotifications() {}
export async function oublierAppareilPush() {}

export function usePreferenceNotifications() {
  return { disponible: false, actif: false, enCours: false, basculer: async (_valeur: boolean) => {} };
}

export function useNotificationsStock(_pret: boolean, _equipeId: string | null, _userId: string | null) {}

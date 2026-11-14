// Notifications push de stock bas / rupture (expo-notifications, SDK 58).
// Le jeton Expo de l'appareil est enregistré en base (RPC enregistrer_appareil_push) ; la fonction Edge
// « push-stock » envoie les notifications quand une alerte de stock s'ouvre ou passe en rupture.
// Version web : notifications.web.ts (sans effet).
import { enregistrerAppareilPush, retirerAppareilPush, type DonneesNotificationStock } from '@factureplus/core';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { confirmer } from '@/lib/confirmer';
import { supabase } from '@/lib/supabase';

const CLE_PREFERENCE = 'factureplus.notifications_stock'; // 'oui' | 'non' (absent : jamais proposé)
const CLE_JETON = 'factureplus.jeton_push';
const CANAL = 'stock';

// Notification reçue application ouverte : bannière et son
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

const lire = (cle: string) => { try { return globalThis.localStorage?.getItem(cle) ?? null; } catch { return null; } };
const ecrire = (cle: string, valeur: string | null) => {
  try {
    if (valeur === null) globalThis.localStorage?.removeItem(cle);
    else globalThis.localStorage?.setItem(cle, valeur);
  } catch { /* stockage indisponible : préférence non mémorisée */ }
};

/** Jeton Expo de l'appareil (canal Android créé avant : nécessaire à la demande d'autorisation sur Android 13+). */
async function jetonAppareil(demander: boolean): Promise<string | null> {
  if (!Device.isDevice) {
    if (demander) throw new Error('Les notifications push ne fonctionnent que sur un vrai téléphone.');
    return null;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Alertes de stock',
      description: 'Produits en stock bas ou en rupture',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let autorisation = await Notifications.getPermissionsAsync();
  if (!autorisation.granted && demander && autorisation.canAskAgain) {
    autorisation = await Notifications.requestPermissionsAsync();
  }
  if (!autorisation.granted) {
    if (demander) {
      throw new Error('Notifications refusées : autorisez-les dans les réglages du téléphone (Réglages › FacturePlus › Notifications).');
    }
    return null;
  }
  const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/** Active les notifications sur cet appareil (demande l'autorisation si besoin). */
export async function activerNotifications() {
  const jeton = await jetonAppareil(true);
  if (!jeton) return;
  await enregistrerAppareilPush(supabase, jeton, Platform.OS === 'ios' ? 'ios' : 'android');
  ecrire(CLE_JETON, jeton);
  ecrire(CLE_PREFERENCE, 'oui');
}

/** Désactive les notifications sur cet appareil. */
export async function desactiverNotifications() {
  const jeton = lire(CLE_JETON);
  if (jeton) await retirerAppareilPush(supabase, jeton);
  ecrire(CLE_JETON, null);
  ecrire(CLE_PREFERENCE, 'non');
}

/** À la déconnexion : l'appareil ne reçoit plus les alertes du compte (la préférence est gardée). */
export async function oublierAppareilPush() {
  const jeton = lire(CLE_JETON);
  if (!jeton) return;
  try { await retirerAppareilPush(supabase, jeton); } catch { /* hors ligne : le jeton sera réattribué à la prochaine connexion */ }
  ecrire(CLE_JETON, null);
}

/** Réglage « Notifications de stock » de l'écran Plus. */
export function usePreferenceNotifications() {
  const [actif, setActif] = useState(() => lire(CLE_PREFERENCE) === 'oui');
  const [enCours, setEnCours] = useState(false);
  const basculer = useCallback(async (valeur: boolean) => {
    setEnCours(true);
    try {
      if (valeur) await activerNotifications(); else await desactiverNotifications();
      setActif(valeur);
    } finally {
      setEnCours(false);
    }
  }, []);
  return { disponible: true, actif, enCours, basculer };
}

/** Au moins un produit suivi (seuil d'alerte renseigné) : c'est le bon moment pour proposer les notifications. */
async function stockSuivi(equipeId: string): Promise<boolean> {
  const { count } = await supabase.from('produits').select('id', { count: 'exact', head: true })
    .eq('equipe_id', equipeId).gt('seuil_alerte', 0);
  return (count ?? 0) > 0;
}

/**
 * Une fois connecté (application prête) :
 *  - notifications activées : réenregistre le jeton (il peut changer, ou l'appareil changer de compte) ;
 *  - jamais proposées : les propose une fois, dès que l'entreprise suit le stock d'au moins un produit ;
 *  - toucher une notification ouvre le produit concerné (y compris au lancement de l'application).
 */
export function useNotificationsStock(pret: boolean, equipeId: string | null, userId: string | null) {
  const reponse = Notifications.useLastNotificationResponse();
  const traitee = useRef<string | null>(null);

  useEffect(() => {
    if (!pret || !reponse || reponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = reponse.notification.request.identifier;
    if (traitee.current === id) return;
    traitee.current = id;
    const donnees = reponse.notification.request.content.data as Partial<DonneesNotificationStock> | undefined;
    if (donnees?.type === 'stock' && donnees.produitId) router.push(`/produit/${donnees.produitId}`);
    Notifications.clearLastNotificationResponse();
  }, [pret, reponse]);

  useEffect(() => {
    if (!pret || !equipeId || !userId) return;
    let annule = false;
    (async () => {
      const preference = lire(CLE_PREFERENCE);
      if (preference === 'oui') {
        const jeton = await jetonAppareil(false);
        if (jeton && !annule) {
          await enregistrerAppareilPush(supabase, jeton, Platform.OS === 'ios' ? 'ios' : 'android');
          ecrire(CLE_JETON, jeton);
        }
      } else if (preference === null && Device.isDevice && await stockSuivi(equipeId) && !annule) {
        const oui = await confirmer('Alertes de stock',
          'Recevoir une notification quand un produit passe en stock bas ou en rupture ? Vous pourrez changer d’avis dans Plus.',
          'Activer');
        if (oui) await activerNotifications();
        else ecrire(CLE_PREFERENCE, 'non');
      }
    })().catch(() => { /* hors ligne ou autorisation refusée : réessayé au prochain lancement */ });
    return () => { annule = true; };
  }, [pret, equipeId, userId]);
}

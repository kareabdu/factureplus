import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

/** Demande de confirmation native. Résout true si l'utilisateur confirme. */
export function confirmer(titre: string, message: string, action = 'Confirmer', destructif = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${titre}\n\n${message}`) ?? true);
  return new Promise((resoudre) => {
    Alert.alert(titre, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resoudre(false) },
      { text: action, style: destructif ? 'destructive' : 'default', onPress: () => resoudre(true) },
    ], { cancelable: true, onDismiss: () => resoudre(false) });
  });
}

export function signalerErreur(e: unknown, titre = 'Action impossible') {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  const message = (e as Error)?.message ?? String(e);
  if (Platform.OS === 'web') globalThis.alert?.(`${titre}\n\n${message}`);
  else Alert.alert(titre, message);
}

export function vibrerSucces() {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Message d'information simple (succès d'une opération longue). */
export function informer(titre: string, message: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${titre}\n\n${message}`);
  else Alert.alert(titre, message);
}

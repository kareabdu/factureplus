import { marquerReinitialisation } from '@factureplus/core/react';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Adresse de retour du lien « Mot de passe oublié » (autorisée par factureplus://** dans Supabase).
 * Racine : la navigation (Stack.Protected) mène d'elle-même à l'écran « Nouveau mot de passe ».
 */
export const LIEN_REINITIALISATION = Linking.createURL('/', { queryParams: { reinitialisation: '1' } });

/**
 * Ouvre la session portée par un lien d'e-mail Supabase (jetons dans le fragment #access_token=…&type=…) :
 * réinitialisation (type=recovery) ou confirmation d'inscription (type=signup, modèle par défaut à lien).
 * Une réinitialisation est marquée avant l'ouverture de la session : seul l'écran « Nouveau mot de passe »
 * est alors accessible, même après fermeture de l'application, jusqu'au changement ou à la déconnexion.
 */
async function ouvrirLien(url: string | null) {
  const diese = url?.indexOf('#') ?? -1;
  if (!url || diese < 0) return;
  const fragment = new URLSearchParams(url.slice(diese + 1));
  const type = fragment.get('type');
  const access_token = fragment.get('access_token');
  const refresh_token = fragment.get('refresh_token');
  if (!type || !access_token || !refresh_token) return;
  if (type === 'recovery') marquerReinitialisation();
  await supabase.auth.setSession({ access_token, refresh_token });
}

/** Suit les liens d'e-mail, application fermée ou déjà ouverte. */
export function useLienRecuperation() {
  useEffect(() => {
    const traiter = (url: string | null) => ouvrirLien(url).catch(() => {});
    Linking.getInitialURL().then(traiter);
    const abonnement = Linking.addEventListener('url', ({ url }) => traiter(url));
    return () => abonnement.remove();
  }, []);
}

import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Adresse de retour du lien « Mot de passe oublié » (autorisée par factureplus://** dans Supabase).
 * Racine et non /compte : expo-router y navigue de lui-même, l'écran du compte est ouvert ensuite par le hook.
 */
export const LIEN_REINITIALISATION = Linking.createURL('/', { queryParams: { reinitialisation: '1' } });

/**
 * Ouvre la session portée par un lien d'e-mail Supabase (jetons dans le fragment #access_token=…&type=…) :
 * réinitialisation (type=recovery) ou confirmation d'inscription (type=signup, modèle par défaut à lien).
 * Renvoie le type du lien, ou null si l'URL n'en était pas un.
 */
async function ouvrirLien(url: string | null): Promise<string | null> {
  const diese = url?.indexOf('#') ?? -1;
  if (!url || diese < 0) return null;
  const fragment = new URLSearchParams(url.slice(diese + 1));
  const type = fragment.get('type');
  const access_token = fragment.get('access_token');
  const refresh_token = fragment.get('refresh_token');
  if (!type || !access_token || !refresh_token) return null;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return error ? null : type;
}

/**
 * Suit les liens d'e-mail (application fermée ou déjà ouverte) ; après une réinitialisation, une fois
 * l'espace prêt, mène à « Mon compte » pour changer le mot de passe.
 */
export function useLienRecuperation(pret: boolean) {
  const [aOuvrir, setAOuvrir] = useState(false);

  useEffect(() => {
    const traiter = (url: string | null) => ouvrirLien(url).then((type) => type === 'recovery' && setAOuvrir(true), () => {});
    Linking.getInitialURL().then(traiter);
    const abonnement = Linking.addEventListener('url', ({ url }) => traiter(url));
    return () => abonnement.remove();
  }, []);

  useEffect(() => {
    if (!pret || !aOuvrir) return;
    // Après le basculement de la navigation vers l'espace
    const minuterie = setTimeout(() => {
      setAOuvrir(false);
      router.push({ pathname: '/compte', params: { reinitialisation: '1' } });
    });
    return () => clearTimeout(minuterie);
  }, [pret, aOuvrir]);
}

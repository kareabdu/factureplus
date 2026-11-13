import { traduireErreur } from '@factureplus/core';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// Web : ferme la fenêtre de connexion ouverte par openAuthSessionAsync
WebBrowser.maybeCompleteAuthSession();

/**
 * Connexion Google : page Google dans une session d'authentification du navigateur système,
 * retour vers factureplus:// avec la session (jetons dans le fragment ou code PKCE).
 * Renvoie false si l'utilisateur a fermé la fenêtre.
 */
async function connexionGoogle(): Promise<boolean> {
  const retour = Linking.createURL('/');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: retour, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('Connexion Google indisponible.');

  const resultat = await WebBrowser.openAuthSessionAsync(data.url, retour);
  if (resultat.type !== 'success') return false;

  const url = new URL(resultat.url);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  const message = url.searchParams.get('error_description') ?? fragment.get('error_description');
  if (message) throw new Error(message.replace(/\+/g, ' '));

  const code = url.searchParams.get('code');
  if (code) {
    const { error: e } = await supabase.auth.exchangeCodeForSession(code);
    if (e) throw e;
    return true;
  }
  const access_token = fragment.get('access_token');
  const refresh_token = fragment.get('refresh_token');
  if (!access_token || !refresh_token) throw new Error('Réponse de Google incomplète. Réessayez.');
  const { error: e } = await supabase.auth.setSession({ access_token, refresh_token });
  if (e) throw e;
  return true;
}

/** « Continuer avec Google » (comme dans l'ancienne application), suivi d'un séparateur « ou ». */
export function BoutonGoogle({ onErreur }: { onErreur: (message: string | null) => void }) {
  const theme = useTheme();
  const [chargement, setChargement] = useState(false);

  async function continuer() {
    onErreur(null);
    setChargement(true);
    try {
      await connexionGoogle();
      // En cas de succès, la navigation bascule d'elle-même (Stack.Protected)
    } catch (e) {
      onErreur(traduireErreur(e));
    } finally {
      setChargement(false);
    }
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <Pressable onPress={continuer} disabled={chargement} accessibilityRole="button" accessibilityLabel="Continuer avec Google"
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two,
          minHeight: 50, borderRadius: Rayons.moyen, borderWidth: 1, borderColor: theme.border,
          backgroundColor: theme.backgroundElement, opacity: pressed || chargement ? 0.7 : 1,
        })}>
        {chargement
          ? <ActivityIndicator color={theme.text} />
          : <Image source={require('@/assets/images/google.png')} style={{ width: 20, height: 20 }} contentFit="contain" />}
        <ThemedText type="smallBold">Continuer avec Google</ThemedText>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }} accessibilityRole="none">
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        <ThemedText type="small" themeColor="textSecondary">ou</ThemedText>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      </View>
    </View>
  );
}

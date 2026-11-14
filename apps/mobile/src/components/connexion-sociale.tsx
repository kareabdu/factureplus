import { traduireErreur } from '@factureplus/core';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeApp } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// Web : ferme la fenêtre de connexion ouverte par openAuthSessionAsync
WebBrowser.maybeCompleteAuthSession();

/**
 * Connexion Google : page Google dans une session d'authentification du navigateur système,
 * retour vers factureplus:// avec la session (jetons dans le fragment ou code PKCE).
 */
async function connexionGoogle(): Promise<void> {
  const retour = Linking.createURL('/');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: retour, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('Connexion Google indisponible.');

  const resultat = await WebBrowser.openAuthSessionAsync(data.url, retour);
  if (resultat.type !== 'success') return;

  const url = new URL(resultat.url);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  const message = url.searchParams.get('error_description') ?? fragment.get('error_description');
  if (message) throw new Error(message.replace(/\+/g, ' '));

  const code = url.searchParams.get('code');
  if (code) {
    const { error: e } = await supabase.auth.exchangeCodeForSession(code);
    if (e) throw e;
    return;
  }
  const access_token = fragment.get('access_token');
  const refresh_token = fragment.get('refresh_token');
  if (!access_token || !refresh_token) throw new Error('Réponse de Google incomplète. Réessayez.');
  const { error: e } = await supabase.auth.setSession({ access_token, refresh_token });
  if (e) throw e;
}

/**
 * Connexion Apple native (iOS) : jeton d'identité Apple échangé contre une session Supabase.
 * Le nom n'est transmis par Apple qu'à la toute première connexion : on l'enregistre alors dans le profil.
 */
async function connexionApple(): Promise<void> {
  const nonce = Crypto.randomUUID();
  const nonceHache = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  let identifiants: AppleAuthentication.AppleAuthenticationCredential;
  try {
    identifiants = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: nonceHache,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return; // fenêtre fermée
    throw e;
  }
  if (!identifiants.identityToken) throw new Error('Réponse d\'Apple incomplète. Réessayez.');

  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: identifiants.identityToken, nonce });
  if (error) throw error;

  const nom = identifiants.fullName
    ? AppleAuthentication.formatFullName(identifiants.fullName).trim()
    : '';
  if (nom && data.user) {
    await supabase.auth.updateUser({ data: { full_name: nom } });
    await supabase.from('profils').update({ nom_complet: nom.slice(0, 120) }).eq('id', data.user.id).is('nom_complet', null);
  }
}

/**
 * « Continuer avec Apple » (iOS) et « Continuer avec Google », suivis d'un séparateur « ou ».
 * En cas de succès, la navigation bascule d'elle-même (Stack.Protected).
 */
export function ConnexionSociale({ onErreur }: { onErreur: (message: string | null) => void }) {
  const theme = useTheme();
  const { schema } = useThemeApp();
  const [chargement, setChargement] = useState<'apple' | 'google' | null>(null);
  const [appleDisponible, setAppleDisponible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleDisponible, () => setAppleDisponible(false));
  }, []);

  async function lancer(fournisseur: 'apple' | 'google') {
    onErreur(null);
    setChargement(fournisseur);
    try {
      await (fournisseur === 'apple' ? connexionApple() : connexionGoogle());
    } catch (e) {
      onErreur(traduireErreur(e));
    } finally {
      setChargement(null);
    }
  }

  return (
    <View style={{ gap: Spacing.three }}>
      {appleDisponible && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={schema === 'sombre'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={Rayons.moyen}
          style={{ height: 50, opacity: chargement ? 0.6 : 1 }}
          onPress={() => { if (!chargement) void lancer('apple'); }}
        />
      )}
      <Pressable onPress={() => lancer('google')} disabled={!!chargement} accessibilityRole="button" accessibilityLabel="Continuer avec Google"
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two,
          minHeight: 50, borderRadius: Rayons.moyen, borderWidth: 1, borderColor: theme.border,
          backgroundColor: theme.backgroundElement, opacity: pressed || chargement ? 0.7 : 1,
        })}>
        {chargement === 'google'
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

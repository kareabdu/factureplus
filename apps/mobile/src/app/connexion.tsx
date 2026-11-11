import { traduireErreur } from '@stocktracker/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Champ, Ecran, Lien, Logo } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function seConnecter() {
    if (!email.trim() || !motDePasse) {
      setErreur('Saisissez votre e-mail et votre mot de passe.');
      return;
    }
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
    setChargement(false);
    if (error) setErreur(traduireErreur(error));
    // En cas de succès, la navigation bascule d'elle-même (Stack.Protected).
  }

  return (
    <Ecran>
      <View style={{ gap: Spacing.two, marginTop: Spacing.five, marginBottom: Spacing.three }}>
        <Logo taille={44} />
        <ThemedText themeColor="textSecondary">Votre stock, vos ventes et vos factures, dans votre poche.</ThemedText>
      </View>
      <ThemedText type="subtitle">Connexion</ThemedText>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
        keyboardType="email-address" textContentType="emailAddress" placeholder="vous@exemple.sn" />
      <Champ libelle="Mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry
        autoComplete="current-password" textContentType="password" onSubmitEditing={seConnecter} returnKeyType="go" />
      <Bouton titre="Se connecter" onPress={seConnecter} chargement={chargement} />
      <Lien titre="Mot de passe oublié ?" onPress={() => router.push('/mot-de-passe-oublie')} />
      <View style={{ marginTop: Spacing.three }}>
        <Lien titre="Pas encore de compte ? Créer un compte" onPress={() => router.push('/inscription')} />
      </View>
    </Ecran>
  );
}

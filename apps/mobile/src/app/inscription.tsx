import { traduireErreur } from '@factureplus/core';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';

import { BoutonGoogle } from '@/components/bouton-google';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Champ, Ecran, Lien } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function Inscription() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [chargement, setChargement] = useState(false);

  async function creerCompte() {
    if (!nom.trim() || !email.trim()) return setErreur('Indiquez votre nom et votre e-mail.');
    if (motDePasse.length < 8) return setErreur('Le mot de passe doit contenir au moins 8 caractères.');
    setErreur(null);
    setChargement(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: motDePasse,
      options: { data: { nom_complet: nom.trim() }, emailRedirectTo: Linking.createURL('/') },
    });
    setChargement(false);
    if (error) return setErreur(traduireErreur(error));
    // Confirmation d'e-mail activée : pas de session tant que le lien n'est pas ouvert
    if (!data.session) setEnvoye(true);
  }

  if (envoye) {
    return (
      <Ecran>
        <ThemedText type="subtitle">Vérifiez vos e-mails</ThemedText>
        <Alerte type="succes">
          Un lien de confirmation a été envoyé à {email.trim()}. Ouvrez-le, puis revenez vous connecter.
        </Alerte>
        <Bouton titre="Aller à la connexion" onPress={() => router.replace('/connexion')} />
      </Ecran>
    );
  }

  return (
    <Ecran>
      <ThemedText type="subtitle">Créer un compte</ThemedText>
      <ThemedText themeColor="textSecondary">7 jours d&apos;essai gratuit, sans engagement.</ThemedText>
      {erreur && <Alerte>{erreur}</Alerte>}
      <BoutonGoogle onErreur={setErreur} />
      <Champ libelle="Votre nom" value={nom} onChangeText={setNom} autoComplete="name" textContentType="name" />
      <Champ libelle="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
        keyboardType="email-address" textContentType="emailAddress" />
      <Champ libelle="Mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry
        autoComplete="new-password" textContentType="newPassword" aide="8 caractères minimum" />
      <Bouton titre="Créer mon compte" onPress={creerCompte} chargement={chargement} />
      <Lien titre="J'ai déjà un compte" onPress={() => router.back()} />
    </Ecran>
  );
}

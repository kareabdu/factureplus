import { traduireErreur } from '@factureplus/core';
import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Champ, Ecran, Lien } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/**
 * Réinitialisation par code à 6 chiffres reçu par e-mail (pas de lien profond à configurer) :
 * le modèle d'e-mail « Reset password » de Supabase doit afficher {{ .Token }}.
 */
export default function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [etape, setEtape] = useState<'email' | 'code'>('email');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function envoyer() {
    if (!email.trim()) return setErreur('Indiquez votre e-mail.');
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setChargement(false);
    if (error) return setErreur(traduireErreur(error));
    setEtape('code');
  }

  async function changer() {
    if (motDePasse.length < 8) return setErreur('Le mot de passe doit contenir au moins 8 caractères.');
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
    if (error) {
      setChargement(false);
      return setErreur('Code invalide ou expiré.');
    }
    const r = await supabase.auth.updateUser({ password: motDePasse });
    setChargement(false);
    if (r.error) setErreur(traduireErreur(r.error));
    // Connecté : la navigation bascule vers l'application.
  }

  return (
    <Ecran>
      <ThemedText type="subtitle">Mot de passe oublié</ThemedText>
      {erreur && <Alerte>{erreur}</Alerte>}
      {etape === 'email' ? (
        <>
          <ThemedText themeColor="textSecondary">Nous vous envoyons un code par e-mail.</ThemedText>
          <Champ libelle="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Bouton titre="Recevoir un code" onPress={envoyer} chargement={chargement} />
        </>
      ) : (
        <>
          <Alerte type="info">Code envoyé à {email.trim()} (pensez aux courriers indésirables).</Alerte>
          <Champ libelle="Code reçu" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code"
            textContentType="oneTimeCode" maxLength={8} />
          <Champ libelle="Nouveau mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry autoComplete="new-password" />
          <Bouton titre="Changer le mot de passe" onPress={changer} chargement={chargement} />
          <Lien titre="Renvoyer un code" onPress={envoyer} />
        </>
      )}
      <Lien titre="Retour à la connexion" onPress={() => router.back()} />
    </Ecran>
  );
}

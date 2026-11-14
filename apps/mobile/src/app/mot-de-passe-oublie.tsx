import { traduireErreur } from '@factureplus/core';
import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Champ, Ecran, Lien } from '@/components/ui';
import { LIEN_REINITIALISATION } from '@/lib/lien-recuperation';
import { supabase } from '@/lib/supabase';

/**
 * Réinitialisation par lien reçu par e-mail : le lien rouvre l'application (factureplus://),
 * qui ouvre la session puis « Mon compte » pour choisir le nouveau mot de passe (voir lien-recuperation.ts).
 */
export default function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function envoyer() {
    if (!email.trim()) return setErreur('Indiquez votre e-mail.');
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: LIEN_REINITIALISATION });
    setChargement(false);
    if (error) return setErreur(traduireErreur(error));
    setEnvoye(true);
  }

  return (
    <Ecran>
      <ThemedText type="subtitle">{envoye ? 'Vérifiez vos e-mails' : 'Mot de passe oublié'}</ThemedText>
      {erreur && <Alerte>{erreur}</Alerte>}
      {envoye ? (
        <>
          <Alerte type="succes">
            Un lien a été envoyé à {email.trim()} (pensez aux courriers indésirables). Ouvrez-le sur ce téléphone pour
            choisir un nouveau mot de passe.
          </Alerte>
          <Lien titre="Renvoyer le lien" onPress={envoyer} />
        </>
      ) : (
        <>
          <ThemedText themeColor="textSecondary">Nous vous envoyons un lien par e-mail.</ThemedText>
          <Champ libelle="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Bouton titre="Recevoir un lien" onPress={envoyer} chargement={chargement} />
        </>
      )}
      <Lien titre="Retour à la connexion" onPress={() => router.back()} />
    </Ecran>
  );
}

import { traduireErreur } from '@factureplus/core';
import { Stack } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Champ, Ecran, Lien } from '@/components/ui';
import { vibrerSucces } from '@/lib/confirmer';
import { useSession } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

/**
 * Arrivée par le lien « Mot de passe oublié » : seul écran accessible (voir _layout.tsx) jusqu'au nouveau
 * mot de passe ou à la déconnexion. Le reste de l'application s'ouvre ensuite de lui-même.
 */
export default function NouveauMotDePasse() {
  const { email, deconnecter, terminerReinitialisation } = useSession();
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function valider() {
    if (motDePasse.length < 8) return setErreur('Le mot de passe doit contenir au moins 8 caractères.');
    if (motDePasse !== confirmation) return setErreur('Les deux mots de passe ne sont pas identiques.');
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setChargement(false);
    if (error) return setErreur(traduireErreur(error));
    vibrerSucces();
    terminerReinitialisation();
  }

  return (
    <Ecran>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ThemedText type="subtitle">Nouveau mot de passe</ThemedText>
      <ThemedText themeColor="textSecondary">Choisissez le nouveau mot de passe de {email ?? 'votre compte'}.</ThemedText>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="Nouveau mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry autoComplete="new-password"
        textContentType="newPassword" autoFocus aide="8 caractères minimum" />
      <Champ libelle="Confirmer le mot de passe" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password"
        textContentType="newPassword" returnKeyType="done" onSubmitEditing={valider} />
      <Bouton titre="Valider" onPress={valider} chargement={chargement} />
      <Lien titre="Annuler et se déconnecter" onPress={() => void deconnecter()} />
    </Ecran>
  );
}

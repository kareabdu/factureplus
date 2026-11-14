import { creerEquipe, trouverDevise } from '@factureplus/core';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Champ, ChoixDevise, Ecran, Lien, Logo } from '@/components/ui';
import { useEquipe, useSession } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

/** Première connexion : création de l'entreprise (équipe). */
export default function Bienvenue() {
  const { rafraichir } = useEquipe();
  const { deconnecter } = useSession();
  const [nom, setNom] = useState('');
  const [devise, setDevise] = useState('XOF');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function creer() {
    if (nom.trim().length < 2) return setErreur("Indiquez le nom de votre commerce.");
    setErreur(null);
    setChargement(true);
    try {
      await creerEquipe(supabase, nom.trim(), devise, trouverDevise(devise)?.symbole ?? devise);
      await rafraichir();
    } catch (e) {
      setErreur((e as Error).message);
      setChargement(false);
    }
  }

  return (
    <Ecran>
      <Logo />
      <ThemedText type="subtitle">Bienvenue !</ThemedText>
      <ThemedText themeColor="textSecondary">
        Comment s&apos;appelle votre commerce ? Ce nom apparaîtra sur vos factures (modifiable plus tard).
      </ThemedText>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="Nom du commerce" value={nom} onChangeText={setNom} placeholder="Ex. Quincaillerie Diallo" autoCapitalize="words" />
      <ChoixDevise valeur={devise} onChange={setDevise} />
      <Bouton titre="Commencer" onPress={creer} chargement={chargement} />
      <Lien titre="Se déconnecter" onPress={deconnecter} />
    </Ecran>
  );
}

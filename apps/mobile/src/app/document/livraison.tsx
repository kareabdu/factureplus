import { chargerDocument, creerBonLivraison } from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Alerte, Bouton, Carte, Champ, ChargementPlein, Ecran, Info } from '@/components/ui';
import { vibrerSucces } from '@/lib/confirmer';
import { supabase } from '@/lib/supabase';

/** Création du bon de livraison d'une facture : nom du livreur (facultatif), affiché sur le bon. */
export default function Livraison() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { donnees } = useDonnees(() => chargerDocument(supabase, id), [id]);
  const [livreur, setLivreur] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  if (!donnees) return <ChargementPlein />;
  const d = donnees.document;

  async function creer() {
    setErreur(null);
    setChargement(true);
    try {
      const blId = await creerBonLivraison(supabase, d.id, livreur);
      vibrerSucces();
      router.replace(`/document/${blId}`);
    } catch (e) {
      setErreur((e as Error).message);
      setChargement(false);
    }
  }

  return (
    <Ecran enTete pied={<Bouton titre="Créer le bon" icone="livraison" onPress={creer} chargement={chargement} />}>
      <Carte>
        <Info libelle={d.numero ?? ''} valeur={d.client_nom} />
      </Carte>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="Nom du livreur" value={livreur} onChangeText={setLivreur} placeholder="Ex. Moussa Diack" autoFocus
        autoCapitalize="words" maxLength={100} returnKeyType="done" onSubmitEditing={creer} aide="Affiché sur le bon de livraison. Facultatif." />
    </Ecran>
  );
}

import { creerInventaire, listerInventaires } from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Badge, Bouton, Ecran, ErreurChargement, LigneListe, Vide } from '@/components/ui';
import { signalerErreur } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Inventaires() {
  const { equipeId } = useEquipe();
  const [creation, setCreation] = useState(false);
  const { donnees, chargement, erreur, recharger } = useDonnees(() => listerInventaires(supabase, equipeId), [equipeId]);
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  async function nouveau() {
    setCreation(true);
    try {
      const id = await creerInventaire(supabase, equipeId);
      router.push(`/inventaire/${id}`);
    } catch (e) {
      signalerErreur(e);
    } finally {
      setCreation(false);
    }
  }

  return (
    <Ecran enTete rafraichir={recharger}>
      <ThemedText type="small" themeColor="textSecondary">
        Comptez vos produits (en scannant ou à la main) : à la clôture, le stock est corrigé et chaque écart est tracé.
      </ThemedText>
      <Bouton titre="Nouvel inventaire" icone="inventaire" onPress={nouveau} chargement={creation} />
      {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
      {!chargement && donnees?.length === 0 && <Vide icone="inventaire" titre="Aucun inventaire" />}
      {donnees?.map((i) => (
        <LigneListe key={i.id} titre={i.reference}
          sousTitre={`${new Date(`${i.date}T00:00:00`).toLocaleDateString('fr-FR')}${i.statut === 'cloture' ? ` · ${i.ecarts} écart${i.ecarts > 1 ? 's' : ''}` : ''}`}
          badge={i.statut === 'cloture' ? <Badge libelle="Clôturé" ton="succes" /> : <Badge libelle="En cours" ton="attention" />}
          onPress={() => router.push(`/inventaire/${i.id}`)} />
      ))}
    </Ecran>
  );
}

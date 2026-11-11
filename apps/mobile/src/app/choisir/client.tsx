import { creerClient, listerClients } from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Bouton, LigneListe, Recherche } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { signalerErreur } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { abandonner, repondre, type ClientChoisi } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

/** Sélection d'un client, avec création rapide à partir du nom recherché. */
export default function ChoisirClient() {
  const { equipeId } = useEquipe();
  const [recherche, setRecherche] = useState('');
  const r = useDeferredValue(recherche);
  const choisi = useRef(false);
  const { donnees } = useDonnees(() => listerClients(supabase, equipeId, r), [equipeId, r]);

  // Écran fermé sans choix (geste, bouton retour) : l'appelant reçoit null
  useEffect(() => () => { if (!choisi.current) abandonner('client'); }, []);

  function choisir(c: ClientChoisi) {
    choisi.current = true;
    repondre('client', c);
  }

  async function creer() {
    try {
      choisir(await creerClient(supabase, equipeId, { nom: recherche.trim() }));
    } catch (e) {
      signalerErreur(e);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <FlatList
        data={donnees ?? []}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six }}
        ListHeaderComponent={<Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom ou téléphone…" />}
        ListFooterComponent={recherche.trim().length > 1 ? (
          <Bouton titre={`Nouveau client « ${recherche.trim()} »`} icone="ajouter" variante="secondaire" onPress={creer} />
        ) : undefined}
        renderItem={({ item: c }) => <LigneListe icone="client" titre={c.nom} sousTitre={c.telephone} onPress={() => choisir(c)} />}
      />
    </ThemedView>
  );
}

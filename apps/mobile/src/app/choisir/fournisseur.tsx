import { creerFournisseur, listerFournisseurs } from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Bouton, LigneListe, Recherche } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { signalerErreur } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { abandonner, repondre, type FournisseurChoisi } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

export default function ChoisirFournisseur() {
  const { equipeId } = useEquipe();
  const [recherche, setRecherche] = useState('');
  const r = useDeferredValue(recherche);
  const choisi = useRef(false);
  const { donnees } = useDonnees(() => listerFournisseurs(supabase, equipeId, r), [equipeId, r]);

  // Écran fermé sans choix (geste, bouton retour) : l'appelant reçoit null
  useEffect(() => () => { if (!choisi.current) abandonner('fournisseur'); }, []);

  function choisir(f: FournisseurChoisi) {
    choisi.current = true;
    repondre('fournisseur', f);
  }

  async function creer() {
    try {
      choisir(await creerFournisseur(supabase, equipeId, { nom: recherche.trim() }));
    } catch (e) {
      signalerErreur(e);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <FlatList
        data={donnees ?? []}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six }}
        ListHeaderComponent={<Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom du fournisseur…" />}
        ListFooterComponent={recherche.trim().length > 1 ? (
          <Bouton titre={`Nouveau fournisseur « ${recherche.trim()} »`} icone="ajouter" variante="secondaire" onPress={creer} />
        ) : undefined}
        renderItem={({ item: f }) => <LigneListe icone="fournisseur" titre={f.nom} sousTitre={f.telephone} onPress={() => choisir(f)} />}
      />
    </ThemedView>
  );
}

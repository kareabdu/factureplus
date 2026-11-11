import { formaterMontant, formaterQuantite, listerProduits, produitParCodeBarres } from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { router } from 'expo-router';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Bouton, LigneListe, Recherche, Vide } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { signalerErreur } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { abandonner, repondre, scannerCode, type ProduitChoisi } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

/** Sélection d'un produit (recherche ou scan) pour une ligne de facture, d'achat… */
export default function ChoisirProduit() {
  const { equipeId, parametres } = useEquipe();
  const [recherche, setRecherche] = useState('');
  const r = useDeferredValue(recherche);
  const choisi = useRef(false);
  const { donnees, chargement } = useDonnees(() => listerProduits(supabase, equipeId, { recherche: r }), [equipeId, r]);

  // Écran fermé sans choix (geste, bouton retour) : l'appelant reçoit null
  useEffect(() => () => { if (!choisi.current) abandonner('produit'); }, []);

  function choisir(p: ProduitChoisi) {
    choisi.current = true;
    repondre('produit', p);
  }

  async function scanner() {
    const code = await scannerCode('Scanner le produit');
    if (!code) return;
    try {
      const p = await produitParCodeBarres(supabase, equipeId, code);
      if (p) choisir(p);
      else signalerErreur(`Aucun produit avec le code ${code}.`, 'Produit inconnu');
    } catch (e) {
      signalerErreur(e);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <FlatList
        data={donnees ?? []}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six }}
        ListHeaderComponent={<Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom, référence…" onScanner={scanner} />}
        ListEmptyComponent={chargement ? undefined : (
          <View style={{ gap: Spacing.three }}>
            <Vide icone="produits" titre="Aucun produit" />
            <Bouton titre="Créer un produit" variante="secondaire" onPress={() => router.push('/produit/editer')} />
          </View>
        )}
        renderItem={({ item: p }) => (
          <LigneListe titre={p.nom} sousTitre={`Stock : ${formaterQuantite(p.quantite)} ${p.unite}`}
            droite={formaterMontant(p.prix_vente, parametres?.symbole_devise)} onPress={() => choisir(p)} />
        )}
      />
    </ThemedView>
  );
}

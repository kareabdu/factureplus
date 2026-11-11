import { estStockBas, formaterMontant, formaterQuantite, listerCategories, listerProduits, produitParCodeBarres, type Produit } from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, BoutonFlottant, ErreurChargement, Pastilles, Recherche, Vide } from '@/components/ui';
import { MaxContentWidth, Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signalerErreur } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { scannerCode } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

type Filtre = 'tous' | 'bas';

export default function Produits() {
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [categorie, setCategorie] = useState<string>('toutes');
  const r = useDeferredValue(recherche);

  const { donnees, chargement, erreur, recharger } = useDonnees(
    () => listerProduits(supabase, equipeId, { recherche: r, stockBas: filtre === 'bas', categorieId: categorie === 'toutes' ? null : categorie }),
    [equipeId, r, filtre, categorie],
  );
  const categories = useDonnees(() => listerCategories(supabase, equipeId), [equipeId]);
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  async function scanner() {
    const code = await scannerCode('Scanner un produit');
    if (!code) return;
    try {
      const p = await produitParCodeBarres(supabase, equipeId, code);
      if (p) router.push(`/produit/${p.id}`);
      else router.push({ pathname: '/produit/editer', params: { code_barres: code } });
    } catch (e) {
      signalerErreur(e);
    }
  }

  const symbole = parametres?.symbole_devise ?? 'FCFA';

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <FlatList
          data={donnees ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.liste}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={false} onRefresh={recharger} />}
          ListHeaderComponent={
            <View style={{ gap: Spacing.three, marginBottom: Spacing.two }}>
              <ThemedText type="subtitle">Produits</ThemedText>
              <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom, référence, code-barres…" onScanner={scanner} />
              <Pastilles options={[{ code: 'tous', libelle: 'Tous' }, { code: 'bas', libelle: 'Stock bas' }]} valeur={filtre} onChange={setFiltre} />
              {(categories.donnees?.length ?? 0) > 0 && (
                <Pastilles options={[{ code: 'toutes', libelle: 'Toutes catégories' }, ...(categories.donnees ?? []).map((c) => ({ code: c.id, libelle: c.nom }))]}
                  valeur={categorie} onChange={setCategorie} />
              )}
              {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
            </View>
          }
          ListEmptyComponent={chargement ? undefined : recherche || filtre !== 'tous' || categorie !== 'toutes' ? (
            <Vide icone="chercher" titre="Aucun produit trouvé" />
          ) : (
            <Vide icone="produits" titre="Aucun produit" texte="Ajoutez votre premier produit ou scannez son code-barres." />
          )}
          renderItem={({ item }) => <CarteProduit produit={item} symbole={symbole} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        />
        <BoutonFlottant libelle="Nouveau produit" onPress={() => router.push('/produit/editer')} />
      </SafeAreaView>
      {chargement && !donnees && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: 0.4 }]} pointerEvents="none" />}
    </ThemedView>
  );
}

function CarteProduit({ produit: p, symbole }: { produit: Produit; symbole: string }) {
  const theme = useTheme();
  const bas = estStockBas(p);
  return (
    <Pressable onPress={() => router.push(`/produit/${p.id}`)} accessibilityRole="button"
      style={({ pressed }) => [styles.carte, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border }]}>
      {p.image_url ? (
        <Image source={{ uri: p.image_url }} style={styles.image} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
          <Icone nom="produits" taille={22} couleur={theme.primary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="smallBold" style={{ fontSize: 15 }} numberOfLines={1}>{p.nom}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {[p.reference, formaterMontant(p.prix_vente, symbole)].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <ThemedText type="smallBold" style={{ fontSize: 16, color: p.quantite === 0 ? theme.danger : bas ? theme.warning : theme.text }}>
          {formaterQuantite(p.quantite)}
        </ThemedText>
        {p.quantite === 0 ? <Badge libelle="Rupture" ton="danger" /> : bas ? <Badge libelle="Stock bas" ton="attention" /> : (
          <ThemedText type="small" themeColor="textSecondary">{p.unite}</ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  liste: { padding: Spacing.three + Spacing.one, paddingBottom: 120, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  carte: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two + Spacing.one, borderRadius: Rayons.moyen, borderWidth: 1 },
  image: { width: 48, height: 48, borderRadius: Rayons.petit },
});

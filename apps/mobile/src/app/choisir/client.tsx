import { creerClient, listerClients, type Client } from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { Contact } from 'expo-contacts';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signalerErreur } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { abandonner, repondre, type ClientChoisi } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

/** Choix du client d'un document : recherche, création rapide, import depuis les contacts du téléphone. */
export default function ChoisirClient() {
  const { equipeId } = useEquipe();
  const theme = useTheme();
  const [recherche, setRecherche] = useState('');
  const [import_, setImport] = useState(false);
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

  /** Sélecteur de contacts du système : seul le contact choisi est lu (pas d'accès au carnet entier). */
  async function importer() {
    setImport(true);
    try {
      const contact = await Contact.presentPicker();
      if (!contact) return;
      const [nom, telephones, adresses] = await Promise.all([
        contact.getFullName(), contact.getPhones().catch(() => []), contact.getAddresses().catch(() => []),
      ]);
      if (!nom?.trim()) return signalerErreur('Ce contact n’a pas de nom.', 'Import impossible');
      const telephone = telephones.find((t) => t.number)?.number?.trim() || null;
      const a = adresses[0];
      const adresse = a ? [a.street, a.city].filter(Boolean).join(', ') || null : null;
      // Client déjà enregistré avec ce nom ou ce numéro : on le reprend
      const existants = await listerClients(supabase, equipeId, telephone ?? nom.trim());
      const doublon = existants.find((c: Client) =>
        c.nom.toLowerCase() === nom.trim().toLowerCase() || (telephone && c.telephone === telephone));
      choisir(doublon ?? await creerClient(supabase, equipeId, { nom: nom.trim(), telephone, adresse }));
    } catch (e) {
      signalerErreur(e, 'Import impossible');
    } finally {
      setImport(false);
    }
  }

  const clients = donnees ?? [];

  return (
    <ThemedView style={{ flex: 1 }}>
      <FlatList
        data={clients}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.contenu}
        ListHeaderComponent={
          <View style={[styles.recherche, { borderColor: theme.primary, backgroundColor: theme.backgroundElement }]}>
            <Icone nom="chercher" taille={22} couleur={theme.primary} />
            <TextInput value={recherche} onChangeText={setRecherche} placeholder="Nom" placeholderTextColor={theme.textSecondary}
              autoCorrect={false} accessibilityLabel="Rechercher un client" style={[styles.rechercheTexte, { color: theme.text }]} />
          </View>
        }
        ListFooterComponent={recherche.trim().length > 1 ? (
          <Pressable onPress={creer} accessibilityRole="button" style={styles.nouveau}>
            <Icone nom="ajouter" taille={20} couleur={theme.primary} />
            <ThemedText style={{ color: theme.primary, fontSize: 17 }}>Nouveau client « {recherche.trim()} »</ThemedText>
          </Pressable>
        ) : undefined}
        renderItem={({ item: c, index }) => (
          <Pressable onPress={() => choisir(c)} accessibilityRole="button"
            style={({ pressed }) => [styles.ligne, {
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border,
              borderTopLeftRadius: index === 0 ? Rayons.grand + 4 : 0, borderTopRightRadius: index === 0 ? Rayons.grand + 4 : 0,
              borderBottomLeftRadius: index === clients.length - 1 ? Rayons.grand + 4 : 0,
              borderBottomRightRadius: index === clients.length - 1 ? Rayons.grand + 4 : 0,
              borderTopWidth: index === 0 ? 1 : 0,
            }]}>
            <ThemedText style={{ fontSize: 18 }} numberOfLines={1}>{c.nom}</ThemedText>
            {!!c.telephone && <ThemedText type="small" themeColor="textSecondary">{c.telephone}</ThemedText>}
          </Pressable>
        )}
      />
      <SafeAreaView edges={['bottom']} style={styles.pied} pointerEvents="box-none">
        <Pressable onPress={importer} disabled={import_} accessibilityRole="button"
          style={({ pressed }) => [styles.importer, { borderColor: theme.primary, backgroundColor: theme.backgroundElement, opacity: pressed || import_ ? 0.7 : 1 }]}>
          <Icone nom="ajouterContact" taille={24} couleur={theme.primary} />
          <ThemedText style={{ color: theme.primary, fontSize: 18, fontWeight: '700' }}>Importer depuis les contacts</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: Spacing.three + Spacing.one, paddingBottom: 140, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  recherche: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderWidth: 2, borderRadius: Rayons.grand,
    paddingHorizontal: Spacing.three, minHeight: 56, marginBottom: Spacing.three },
  rechercheTexte: { flex: 1, fontSize: 19, paddingVertical: Spacing.two },
  ligne: { paddingHorizontal: Spacing.three + Spacing.one, paddingVertical: Spacing.three, minHeight: 56, justifyContent: 'center',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, gap: 2 },
  nouveau: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three, paddingHorizontal: Spacing.one },
  pied: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.three + Spacing.one, paddingBottom: Spacing.three },
  importer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three, borderWidth: 2,
    borderRadius: Rayons.plein, minHeight: 60, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});

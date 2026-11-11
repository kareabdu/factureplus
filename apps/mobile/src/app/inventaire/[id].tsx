import {
  chargerInventaire, cloturerInventaire, formaterQuantite, lireQuantite, saisirComptage, supprimerInventaire, type LigneInventaire,
} from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Alerte, Badge, Bouton, BoutonIcone, ChargementPlein, Pastilles, Recherche } from '@/components/ui';
import { MaxContentWidth, Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmer, informer, signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { scannerCode } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

type Vue = 'tous' | 'a_compter' | 'ecarts';

export default function Inventaire() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { donnees, recharger, setDonnees } = useDonnees(() => chargerInventaire(supabase, id), [id]);
  const [recherche, setRecherche] = useState('');
  const [vue, setVue] = useState<Vue>('tous');
  const [cloture, setCloture] = useState(false);
  const [cible, setCible] = useState<string | null>(null);
  const r = useDeferredValue(recherche.trim().toLowerCase());

  const lignes = useMemo(() => (donnees?.lignes ?? []).filter((l) => {
    if (vue === 'a_compter' && l.quantite_comptee != null) return false;
    if (vue === 'ecarts' && (l.quantite_comptee == null || l.quantite_comptee === l.quantite_theorique)) return false;
    if (!r) return true;
    const p = l.produits;
    return [p?.nom, p?.reference, p?.code_barres].some((v) => v?.toLowerCase().includes(r));
  }), [donnees, vue, r]);

  if (!donnees) return <ChargementPlein />;
  const { inventaire: inv } = donnees;
  const ouvert = inv.statut === 'brouillon';
  const comptes = donnees.lignes.filter((l) => l.quantite_comptee != null).length;

  async function compter(produitId: string, quantite: number | null) {
    // Mise à jour optimiste, puis enregistrement
    setDonnees((d) => d && { ...d, lignes: d.lignes.map((l) => (l.produit_id === produitId ? { ...l, quantite_comptee: quantite } : l)) });
    try {
      await saisirComptage(supabase, id, produitId, quantite);
    } catch (e) {
      signalerErreur(e);
      void recharger();
    }
  }

  async function scanner() {
    const code = await scannerCode('Scanner pour compter');
    if (!code) return;
    const l = donnees!.lignes.find((x) => x.produits?.code_barres === code);
    if (!l) return signalerErreur(`Aucun produit avec le code ${code} dans cet inventaire.`, 'Produit inconnu');
    // Chaque scan ajoute 1 au comptage
    await compter(l.produit_id, (l.quantite_comptee ?? 0) + 1);
    vibrerSucces();
    setCible(l.produit_id);
    setRecherche(l.produits?.nom ?? '');
  }

  async function cloturer() {
    const nonComptes = donnees!.lignes.length - comptes;
    const msg = `${comptes} produit(s) compté(s)${nonComptes ? `, ${nonComptes} non compté(s) (stock inchangé)` : ''}. Le stock sera corrigé selon vos comptages.`;
    if (!(await confirmer('Clôturer l’inventaire', msg, 'Clôturer'))) return;
    setCloture(true);
    try {
      const n = await cloturerInventaire(supabase, id);
      vibrerSucces();
      await recharger();
      informer('Inventaire clôturé', `${n} écart${n > 1 ? 's' : ''} corrigé${n > 1 ? 's' : ''}.`);
    } catch (e) {
      signalerErreur(e);
    } finally {
      setCloture(false);
    }
  }

  async function supprimer() {
    if (!(await confirmer('Supprimer l’inventaire', 'Les comptages saisis seront perdus.', 'Supprimer', true))) return;
    try {
      await supprimerInventaire(supabase, id);
      router.back();
    } catch (e) {
      signalerErreur(e);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{
        title: inv.reference,
        headerRight: ouvert ? () => <BoutonIcone icone="supprimer" libelle="Supprimer" couleur={theme.danger} onPress={supprimer} /> : undefined,
      }} />
      <FlatList
        data={lignes}
        keyExtractor={(l) => l.produit_id}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.liste}
        ListHeaderComponent={
          <View style={{ gap: Spacing.three, marginBottom: Spacing.two }}>
            {ouvert ? (
              <ThemedText type="small" themeColor="textSecondary">{comptes} / {donnees.lignes.length} produits comptés</ThemedText>
            ) : (
              <Alerte type="succes">Clôturé le {new Date(inv.cloture_le!).toLocaleDateString('fr-FR')} · {inv.ecarts} écart(s) corrigé(s)</Alerte>
            )}
            <Recherche valeur={recherche} onChange={setRecherche} placeholder="Chercher un produit…" onScanner={ouvert ? scanner : undefined} />
            <Pastilles options={[{ code: 'tous', libelle: 'Tous' }, { code: 'a_compter', libelle: 'À compter' }, { code: 'ecarts', libelle: 'Écarts' }]}
              valeur={vue} onChange={setVue} />
          </View>
        }
        renderItem={({ item }) => <LigneComptage ligne={item} ouvert={ouvert} surligne={item.produit_id === cible} onCompter={(q) => compter(item.produit_id, q)} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
      />
      {ouvert && (
        <View style={[styles.pied, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
          <Bouton titre="Clôturer l'inventaire" icone="valider" onPress={cloturer} chargement={cloture} desactive={comptes === 0} />
        </View>
      )}
    </ThemedView>
  );
}

function LigneComptage({ ligne: l, ouvert, surligne, onCompter }: {
  ligne: LigneInventaire; ouvert: boolean; surligne: boolean; onCompter: (q: number | null) => void;
}) {
  const theme = useTheme();
  const [texte, setTexte] = useState(l.quantite_comptee == null ? '' : formaterQuantite(l.quantite_comptee));
  const [vu, setVu] = useState(l.quantite_comptee);
  // Comptage modifié par un scan : on resynchronise le champ
  if (vu !== l.quantite_comptee) {
    setVu(l.quantite_comptee);
    setTexte(l.quantite_comptee == null ? '' : formaterQuantite(l.quantite_comptee));
  }
  const ecart = l.quantite_comptee == null ? null : l.quantite_comptee - l.quantite_theorique;
  return (
    <View style={[styles.ligne, { backgroundColor: theme.backgroundElement, borderColor: surligne ? theme.primary : theme.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="smallBold" numberOfLines={1}>{l.produits?.nom}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Théorique : {formaterQuantite(l.quantite_theorique)} {l.produits?.unite}</ThemedText>
        {ecart != null && ecart !== 0 && <Badge libelle={`Écart ${ecart > 0 ? '+' : ''}${formaterQuantite(ecart)}`} ton={ecart < 0 ? 'danger' : 'info'} />}
      </View>
      <TextInput
        value={texte} editable={ouvert} keyboardType="decimal-pad" selectTextOnFocus placeholder="—" placeholderTextColor={theme.textSecondary}
        accessibilityLabel={`Quantité comptée pour ${l.produits?.nom}`}
        onChangeText={setTexte}
        onEndEditing={() => {
          const q = texte.trim() ? lireQuantite(texte) : null;
          if (texte.trim() && q == null) return setTexte(l.quantite_comptee == null ? '' : formaterQuantite(l.quantite_comptee));
          if (q !== l.quantite_comptee) onCompter(q);
        }}
        style={[styles.saisie, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  liste: { padding: Spacing.three, paddingBottom: 140, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Rayons.moyen, borderWidth: 1 },
  saisie: { width: 84, height: 46, borderWidth: 1, borderRadius: Rayons.petit, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  pied: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.three, paddingBottom: Spacing.five, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
});

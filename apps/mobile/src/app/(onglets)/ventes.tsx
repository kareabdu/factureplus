import {
  chargerResume, formaterMontant, LIBELLES_TYPE_DOCUMENT, listerDocuments, resteAPayer, statutAffiche, type Document, type TypeDocument,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, BoutonFlottant, Carte, useMargeOnglets, ErreurChargement, LigneListe, Pastilles, Recherche, Vide } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

type Vue = 'tout' | 'impayes' | 'brouillons';

export default function Ventes() {
  const { equipeId, parametres } = useEquipe();
  const [type, setType] = useState<TypeDocument>('facture');
  const [vue, setVue] = useState<Vue>('tout');
  const [recherche, setRecherche] = useState('');
  const margeOnglets = useMargeOnglets();
  const r = useDeferredValue(recherche);
  const symbole = parametres?.symbole_devise ?? 'FCFA';

  const { donnees, chargement, erreur, recharger } = useDonnees(
    () => listerDocuments(supabase, equipeId, type, {
      recherche: r,
      statuts: vue === 'impayes' ? ['emis'] : vue === 'brouillons' ? ['brouillon'] : undefined,
    }),
    [equipeId, type, vue, r],
  );
  // Total des factures validées (émises ou payées) de l'année civile en cours, calculé par la base (ventes_annee)
  const annee = new Date().getFullYear();
  const totalAnnee = useDonnees(() => chargerResume(supabase, equipeId), [equipeId]);
  const rechargerTotal = totalAnnee.recharger;
  useFocusEffect(useCallback(() => {
    void recharger();
    void rechargerTotal();
  }, [recharger, rechargerTotal]));

  const vues: { code: Vue; libelle: string }[] = type === 'facture'
    ? [{ code: 'tout', libelle: 'Toutes' }, { code: 'impayes', libelle: 'À encaisser' }, { code: 'brouillons', libelle: 'Brouillons' }]
    : [{ code: 'tout', libelle: 'Tous' }, { code: 'brouillons', libelle: 'Brouillons' }];

  const total = (donnees ?? []).filter((d) => d.statut === 'emis').reduce((s, d) => s + resteAPayer(d), 0);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <FlatList
          data={donnees ?? []}
          keyExtractor={(d) => d.id}
          contentContainerStyle={[styles.liste, { paddingBottom: 120 + margeOnglets }]}
          keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={false} onRefresh={recharger} />}
          ListHeaderComponent={
            <View style={{ gap: Spacing.three, marginBottom: Spacing.two }}>
              <ThemedText type="subtitle">Ventes</ThemedText>
              <Pastilles options={[{ code: 'facture', libelle: 'Factures' }, { code: 'proforma', libelle: 'Proformas' }, { code: 'bl', libelle: 'Livraisons' }]}
                valeur={type} onChange={(t) => { setType(t); setVue('tout'); }} />
              <Recherche valeur={recherche} onChange={setRecherche} placeholder="Numéro ou client…" />
              <Pastilles options={vues} valeur={vue} onChange={setVue} />
              {type === 'facture' && vue === 'tout' && totalAnnee.donnees && (
                <Carte>
                  <ThemedText type="small" themeColor="textSecondary">Total des factures {annee}</ThemedText>
                  <ThemedText type="smallBold" style={{ fontSize: 22, lineHeight: 28 }}>
                    {formaterMontant(totalAnnee.donnees.ventes_annee, symbole)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {totalAnnee.donnees.nb_factures_annee} facture{totalAnnee.donnees.nb_factures_annee > 1 ? 's' : ''} validée{totalAnnee.donnees.nb_factures_annee > 1 ? 's' : ''}, hors brouillons et annulées
                  </ThemedText>
                </Carte>
              )}
              {type === 'facture' && vue === 'impayes' && total > 0 && (
                <ThemedText type="small" themeColor="textSecondary">Reste à encaisser : {formaterMontant(total, symbole)}</ThemedText>
              )}
              {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
            </View>
          }
          ListEmptyComponent={chargement ? undefined : (
            <Vide icone="ventes" titre={`Aucun${type === 'facture' ? 'e facture' : type === 'proforma' ? 'e proforma' : ' bon de livraison'}`}
              texte={type === 'bl' ? 'Les bons de livraison se créent depuis une facture validée.' : undefined} />
          )}
          renderItem={({ item }) => <LigneDocument d={item} symbole={symbole} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        />
        {type !== 'bl' && (
          <BoutonFlottant libelle={`Nouvelle ${LIBELLES_TYPE_DOCUMENT[type].toLowerCase()}`}
            onPress={() => router.push({ pathname: '/document/editer', params: { type } })} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function LigneDocument({ d, symbole }: { d: Document; symbole: string }) {
  const s = statutAffiche(d);
  const date = new Date(`${d.date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <LigneListe
      titre={d.client_nom || 'Client non renseigné'}
      sousTitre={`${d.numero ?? 'Brouillon'} · ${date}`}
      droite={d.type === 'bl' ? undefined : formaterMontant(d.total, symbole)}
      badge={<Badge libelle={s.libelle} ton={s.ton} />}
      onPress={() => router.push(d.statut === 'brouillon'
        ? { pathname: '/document/editer', params: { id: d.id, type: d.type } }
        : `/document/${d.id}`)}
    />
  );
}

const styles = StyleSheet.create({
  liste: { padding: Spacing.three + Spacing.one, paddingBottom: 120, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});

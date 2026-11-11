import {
  chargerProduit, estStockBas, formaterMontant, formaterQuantite, LIBELLES_MOUVEMENT, listerCategories, listerMouvements,
  modifierProduit, supprimerProduit,
} from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Badge, Bouton, BoutonIcone, Carte, ChargementPlein, Ecran, ErreurChargement, Info, LigneListe, Section,
} from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmer, signalerErreur } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function FicheProduit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const symbole = parametres?.symbole_devise ?? 'FCFA';
  const { donnees, erreur, recharger } = useDonnees(
    () => Promise.all([chargerProduit(supabase, id), listerMouvements(supabase, equipeId, { produitId: id, limite: 30 }), listerCategories(supabase, equipeId)]),
    [id, equipeId],
  );
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  if (erreur && !donnees) return <Ecran enTete><ErreurChargement message={erreur} reessayer={recharger} /></Ecran>;
  if (!donnees) return <ChargementPlein />;
  const [p, mouvements, categories] = donnees;
  const categorie = categories.find((c) => c.id === p.categorie_id);
  const marge = p.prix_vente - p.prix_achat;

  async function supprimer() {
    if (!(await confirmer('Supprimer le produit', `Supprimer « ${p.nom} » ?`, 'Supprimer', true))) return;
    try {
      await supprimerProduit(supabase, p.id);
      router.back();
    } catch {
      // Produit avec historique : on propose de le désactiver
      if (await confirmer('Produit utilisé', 'Ce produit a un historique de stock ou de ventes. Le désactiver ? Il n’apparaîtra plus dans les listes.', 'Désactiver')) {
        try {
          await modifierProduit(supabase, p.id, { actif: false });
          router.back();
        } catch (e) {
          signalerErreur(e);
        }
      }
    }
  }

  const mouvementer = (type: 'entree' | 'sortie' | 'ajustement') =>
    router.push({ pathname: '/produit/mouvement', params: { id: p.id, type } });

  return (
    <>
      <Stack.Screen options={{
        title: p.nom,
        headerRight: () => <BoutonIcone icone="modifier" libelle="Modifier" onPress={() => router.push({ pathname: '/produit/editer', params: { id: p.id } })} />,
      }} />
      <Ecran enTete rafraichir={recharger}>
        <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'center' }}>
          {p.image_url && <Image source={{ uri: p.image_url }} style={{ width: 88, height: 88, borderRadius: Rayons.moyen }} contentFit="cover" />}
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText type="smallBold" style={{ fontSize: 20, lineHeight: 26 }}>{p.nom}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{[p.reference, categorie?.nom].filter(Boolean).join(' · ')}</ThemedText>
            {!p.actif && <Badge libelle="Désactivé" ton="neutre" />}
          </View>
        </View>

        <Carte>
          <ThemedText type="small" themeColor="textSecondary">En stock</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two }}>
            <ThemedText style={{ fontSize: 34, lineHeight: 40, fontWeight: 700, color: p.quantite === 0 ? theme.danger : estStockBas(p) ? theme.warning : theme.text }}>
              {formaterQuantite(p.quantite)}
            </ThemedText>
            <ThemedText themeColor="textSecondary">{p.unite}</ThemedText>
            {p.quantite === 0 ? <Badge libelle="Rupture" ton="danger" /> : estStockBas(p) ? <Badge libelle="Stock bas" ton="attention" /> : null}
          </View>
          {p.seuil_alerte > 0 && <ThemedText type="small" themeColor="textSecondary">Alerte à {formaterQuantite(p.seuil_alerte)} {p.unite}</ThemedText>}
          <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two }}>
            <Bouton titre="Entrée" icone="ajouter" onPress={() => mouvementer('entree')} />
            <Bouton titre="Sortie" icone="retirer" variante="secondaire" onPress={() => mouvementer('sortie')} />
          </View>
          <Bouton titre="Ajuster le stock" variante="secondaire" onPress={() => mouvementer('ajustement')} />
        </Carte>

        <Carte>
          <Info libelle="Prix de vente" valeur={formaterMontant(p.prix_vente, symbole)} fort />
          <Info libelle="Prix d'achat" valeur={formaterMontant(p.prix_achat, symbole)} />
          <Info libelle="Marge unitaire" valeur={formaterMontant(marge, symbole)} />
          <Info libelle="Valeur du stock (achat)" valeur={formaterMontant(Math.round(p.quantite * p.prix_achat), symbole)} />
          {p.code_barres && <Info libelle="Code-barres" valeur={p.code_barres} />}
        </Carte>

        {p.description && <Carte titre="Description"><ThemedText type="small">{p.description}</ThemedText></Carte>}

        <Section titre="Derniers mouvements">
          {mouvements.length === 0 && <ThemedText type="small" themeColor="textSecondary">Aucun mouvement.</ThemedText>}
          {mouvements.map((m) => (
            <LigneListe key={m.id}
              titre={`${LIBELLES_MOUVEMENT[m.type]}${m.motif ? ` · ${m.motif}` : ''}`}
              sousTitre={`${new Date(m.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}${m.reference ? ` · ${m.reference}` : ''}`}
              droite={`${m.variation > 0 ? '+' : ''}${formaterQuantite(m.variation)}`}
              sousDroite={<ThemedText type="small" themeColor="textSecondary">→ {formaterQuantite(m.quantite_apres)}</ThemedText>}
              onPress={m.document_id ? () => router.push(`/document/${m.document_id}`) : m.achat_id ? () => router.push(`/achat/${m.achat_id}`) : undefined}
            />
          ))}
        </Section>

        <Bouton titre="Supprimer le produit" icone="supprimer" variante="danger" onPress={supprimer} />
      </Ecran>
    </>
  );
}

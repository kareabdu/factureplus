import {
  formaterMontant, LIBELLES_ETATS_ACCES, LIBELLES_MOYENS_ABONNEMENT, LIBELLES_STATUTS_PAIEMENT, listerPaiementsPlateforme,
  listerUtilisateursPlateforme, statistiquesPlateforme, TONS_ETATS_ACCES, type EtatAcces,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Carte, ChargementPlein, Ecran, ErreurChargement, LigneListe, Pastilles, Recherche, Section, Vide } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { dateCourte } from '@/lib/dates';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

type Vue = 'utilisateurs' | 'paiements';

/** Administration de la plateforme : statistiques, comptes, paiements. */
export default function Administration() {
  const { estAdmin } = useEquipe();
  const [vue, setVue] = useState<Vue>('utilisateurs');
  const [filtre, setFiltre] = useState<EtatAcces | 'tous'>('tous');
  const [recherche, setRecherche] = useState('');
  const r = useDeferredValue(recherche);
  const { donnees, erreur, recharger } = useDonnees(
    () => (estAdmin ? Promise.all([statistiquesPlateforme(supabase), listerUtilisateursPlateforme(supabase, r), listerPaiementsPlateforme(supabase, 100)])
      : Promise.resolve(null)),
    [estAdmin, r],
  );
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  if (!estAdmin) return <Ecran enTete><Vide icone="admin" titre="Réservé aux administrateurs" /></Ecran>;
  if (!donnees && !erreur) return <ChargementPlein />;
  const [stats, utilisateurs, paiements] = donnees ?? [null, [], []];
  const liste = filtre === 'tous' ? utilisateurs : utilisateurs.filter((u) => u.etat === filtre);

  return (
    <Ecran enTete rafraichir={recharger}>
      {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
      {stats && (
        <View style={styles.grille}>
          <Tuile libelle="Comptes" valeur={String(stats.utilisateurs)} sous={`+${stats.nouveaux_7_jours} en 7 jours`} />
          <Tuile libelle="Abonnés" valeur={String(stats.abonnes)} sous={`${stats.en_essai} en essai · ${stats.expires} expirés`} />
          <Tuile libelle="Revenus du mois" valeur={formaterMontant(stats.revenus_mois)} />
          <Tuile libelle="Revenus totaux" valeur={formaterMontant(stats.revenus_total)}
            sous={stats.paiements_en_attente ? `${stats.paiements_en_attente} paiement(s) en attente` : undefined} />
        </View>
      )}

      <Pastilles options={[{ code: 'utilisateurs', libelle: 'Utilisateurs' }, { code: 'paiements', libelle: 'Paiements' }]} valeur={vue} onChange={setVue} />

      {vue === 'utilisateurs' ? (
        <>
          <Recherche valeur={recherche} onChange={setRecherche} placeholder="E-mail, nom, entreprise…" />
          <Pastilles options={[{ code: 'tous', libelle: 'Tous' }, ...(['essai', 'actif', 'expire'] as const).map((e) => ({ code: e, libelle: LIBELLES_ETATS_ACCES[e] }))]}
            valeur={filtre} onChange={setFiltre} />
          <Section titre={`${liste.length} compte${liste.length > 1 ? 's' : ''}`}>
            {liste.map((u) => (
              <LigneListe key={u.id} titre={u.entreprise || u.nom_complet || u.email || 'Sans nom'}
                sousTitre={`${u.email ?? ''} · inscrit le ${dateCourte(u.created_at.slice(0, 10))}`}
                badge={<Badge libelle={LIBELLES_ETATS_ACCES[u.etat]} ton={TONS_ETATS_ACCES[u.etat]} />}
                onPress={() => router.push(`/utilisateur/${u.id}`)} />
            ))}
          </Section>
        </>
      ) : (
        <Section titre="Derniers paiements">
          {paiements.length === 0 && <Vide icone="paiement" titre="Aucun paiement" />}
          {paiements.map((p) => (
            <LigneListe key={p.id} titre={p.email ?? 'Compte supprimé'}
              sousTitre={`${dateCourte((p.paye_le ?? p.created_at).slice(0, 10))} · ${p.plan} · ${LIBELLES_MOYENS_ABONNEMENT[p.moyen]}`}
              droite={formaterMontant(p.montant)}
              badge={<Badge libelle={LIBELLES_STATUTS_PAIEMENT[p.statut]} ton={p.statut === 'paye' ? 'succes' : p.statut === 'en_attente' ? 'attention' : 'neutre'} />}
              onPress={() => router.push(`/utilisateur/${p.utilisateur_id}`)} />
          ))}
        </Section>
      )}
    </Ecran>
  );
}

function Tuile({ libelle, valeur, sous }: { libelle: string; valeur: string; sous?: string }) {
  return (
    <Carte style={styles.tuile}>
      <ThemedText type="small" themeColor="textSecondary">{libelle}</ThemedText>
      <ThemedText type="smallBold" style={{ fontSize: 18 }} numberOfLines={1} adjustsFontSizeToFit>{valeur}</ThemedText>
      {sous && <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{sous}</ThemedText>}
    </Carte>
  );
}

const styles = StyleSheet.create({
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + Spacing.one },
  tuile: { flexBasis: '47%', flexGrow: 1, gap: Spacing.one, borderRadius: Rayons.grand },
});

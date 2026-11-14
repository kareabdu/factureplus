import { LIBELLES_ETATS_ACCES, LIBELLES_THEMES, type PreferenceTheme } from '@factureplus/core';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Ecran, Interrupteur, LigneListe, Pastilles, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { confirmer, signalerErreur } from '@/lib/confirmer';
import { useEquipe, useSession } from '@/lib/espace';
import { oublierAppareilPush, usePreferenceNotifications } from '@/lib/notifications';
import { useThemeApp } from '@/lib/theme';

export default function Plus() {
  const { deconnecter, email } = useSession();
  const { parametres, abonnement, estAdmin } = useEquipe();
  const { preference, changerPreference } = useThemeApp();
  const notifications = usePreferenceNotifications();

  return (
    <Ecran onglets>
      <ThemedText type="subtitle">Plus</ThemedText>

      <Section titre="Stock">
        <LigneListe icone="mouvements" titre="Mouvements de stock" sousTitre="Entrées, sorties, ajustements" onPress={() => router.push('/mouvements')} />
        <LigneListe icone="inventaire" titre="Inventaires" sousTitre="Compter le stock et corriger les écarts" onPress={() => router.push('/inventaires')} />
        <LigneListe icone="alerte" titre="Alertes de stock" onPress={() => router.push('/alertes')} />
        <LigneListe icone="categorie" titre="Catégories" onPress={() => router.push('/categories')} />
        <LigneListe icone="tableur" titre="Importer / exporter les produits" sousTitre="Fichier Excel ou CSV" onPress={() => router.push('/import-export')} />
      </Section>

      <Section titre="Achats et dépenses">
        <LigneListe icone="achats" titre="Achats fournisseurs" sousTitre="Réceptions de marchandises" onPress={() => router.push('/achats')} />
        <LigneListe icone="depense" titre="Dépenses" sousTitre="Loyer, salaires, transport…" onPress={() => router.push('/depenses')} />
      </Section>

      <Section titre="Tiers">
        <LigneListe icone="fournisseur" titre="Fournisseurs" onPress={() => router.push('/fournisseurs')} />
        <LigneListe icone="client" titre="Clients" onPress={() => router.push('/clients')} />
      </Section>

      <Section titre="Réglages">
        <LigneListe icone="reglages" titre="Entreprise et factures" sousTitre={parametres?.nom_entreprise} onPress={() => router.push('/parametres')} />
        <LigneListe icone="abonnement" titre="Abonnement"
          sousTitre={abonnement ? `${LIBELLES_ETATS_ACCES[abonnement.etat]}${abonnement.fin ? ` · jusqu'au ${abonnement.fin.toLocaleDateString('fr-FR')}` : ''}` : undefined}
          onPress={() => router.push('/abonnement')} />
        <LigneListe icone="compte" titre="Mon compte" sousTitre={email} onPress={() => router.push('/compte')} />
        {estAdmin && <LigneListe icone="admin" titre="Administration" sousTitre="Comptes, abonnements, paiements" onPress={() => router.push('/admin')} />}
        {notifications.disponible && (
          <Interrupteur libelle="Notifications de stock" aide="Stock bas et rupture, sur ce téléphone"
            valeur={notifications.actif}
            onChange={(v) => { if (!notifications.enCours) notifications.basculer(v).catch((e) => signalerErreur(e, 'Notifications')); }} />
        )}
        <Pastilles libelle="Apparence" options={(Object.keys(LIBELLES_THEMES) as PreferenceTheme[]).map((code) => ({ code, libelle: LIBELLES_THEMES[code] }))}
          valeur={preference} onChange={changerPreference} />
      </Section>

      <LigneListe icone="deconnexion" titre="Se déconnecter" onPress={async () => {
        if (await confirmer('Se déconnecter', 'Voulez-vous vous déconnecter ?', 'Se déconnecter')) {
          await oublierAppareilPush();
          await deconnecter();
        }
      }} />

      <View style={{ alignItems: 'center', marginTop: Spacing.two }}>
        <ThemedText type="small" themeColor="textSecondary">FacturePlus {Constants.expoConfig?.version ?? ''}</ThemedText>
      </View>
    </Ecran>
  );
}

import { chargerResume, formaterMontant, joursEssaiRestants, listerAlertes, formaterQuantite } from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icone, type NomIcone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Carte, ChargementPlein, Ecran, ErreurChargement, LigneListe, Section } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Accueil() {
  const { equipeId, parametres, profil } = useEquipe();
  const theme = useTheme();
  const symbole = parametres?.symbole_devise ?? 'FCFA';
  const m = (v: number) => formaterMontant(v, symbole);
  // Instant de référence du graphique (figé au montage de l'écran)
  const [maintenant] = useState(() => Date.now());

  const { donnees, chargement, erreur, recharger } = useDonnees(
    () => Promise.all([chargerResume(supabase, equipeId), listerAlertes(supabase, equipeId)]),
    [equipeId],
  );
  // Rafraîchit en revenant sur l'onglet (après une vente, un mouvement…)
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  if (chargement && !donnees) return <ChargementPlein />;
  const [r, alertes] = donnees ?? [null, []];
  const essai = profil && profil.abonnement_statut === 'essai' ? joursEssaiRestants(profil) : null;
  const maxJour = Math.max(1, ...(r?.ventes_par_jour ?? []).map((j) => j.total));

  return (
    <Ecran onglets rafraichir={recharger}>
      <View style={{ gap: 2 }}>
        <ThemedText type="small" themeColor="textSecondary">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</ThemedText>
        <ThemedText type="subtitle" numberOfLines={1}>{parametres?.nom_entreprise || 'Accueil'}</ThemedText>
      </View>

      {essai !== null && essai <= 3 && (
        <Alerte type={essai > 0 ? 'attention' : 'erreur'}>
          {essai > 0 ? `Votre essai gratuit se termine dans ${essai} jour${essai > 1 ? 's' : ''}.` : 'Votre essai gratuit est terminé.'}
        </Alerte>
      )}
      {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}

      {r && (
        <>
          <Carte style={{ backgroundColor: theme.primary, borderColor: theme.primary }}>
            <ThemedText type="small" style={{ color: theme.onPrimary, opacity: 0.85 }}>Ventes du mois</ThemedText>
            <ThemedText style={{ color: theme.onPrimary, fontSize: 30, lineHeight: 38, fontWeight: 700 }}>{m(r.ventes_periode)}</ThemedText>
            <ThemedText type="small" style={{ color: theme.onPrimary, opacity: 0.85 }}>
              {r.nb_factures_periode} facture{r.nb_factures_periode > 1 ? 's' : ''} · encaissé {m(r.encaisse_periode)}
            </ThemedText>
            {r.ventes_par_jour.length > 0 && (
              <View style={styles.graphe} accessibilityLabel="Ventes des 30 derniers jours">
                {Array.from({ length: 30 }, (_, i) => {
                  const jour = new Date(maintenant - (29 - i) * 86_400_000).toISOString().slice(0, 10);
                  const v = r.ventes_par_jour.find((j) => j.jour === jour)?.total ?? 0;
                  return <View key={jour} style={[styles.barre, { height: `${Math.max(4, (v / maxJour) * 100)}%`, backgroundColor: theme.onPrimary, opacity: v ? 0.9 : 0.25 }]} />;
                })}
              </View>
            )}
          </Carte>

          <View style={styles.grille}>
            <Tuile icone="tendance" libelle="Marge du mois" valeur={m(r.marge_periode)} />
            <Tuile icone="paiement" libelle="Impayés" valeur={m(r.impayes)} ton={r.impayes > 0 ? 'attention' : undefined}
              onPress={() => router.navigate('/ventes')} />
            <Tuile icone="produits" libelle="Valeur du stock" valeur={m(r.valeur_stock_achat)} sous={`${r.nb_produits} produits`}
              onPress={() => router.navigate('/produits')} />
            <Tuile icone="alerte" libelle="Stock bas" valeur={String(r.nb_alertes)} sous={r.nb_ruptures ? `dont ${r.nb_ruptures} en rupture` : undefined}
              ton={r.nb_alertes > 0 ? 'danger' : undefined} onPress={() => router.push('/alertes')} />
          </View>

          <Section titre="Actions rapides">
            <View style={styles.grille}>
              <Action icone="ventes" libelle="Nouvelle facture" onPress={() => router.push({ pathname: '/document/editer', params: { type: 'facture' } })} />
              <Action icone="produits" libelle="Nouveau produit" onPress={() => router.push('/produit/editer')} />
              <Action icone="achats" libelle="Nouvel achat" onPress={() => router.push('/achat/editer')} />
              <Action icone="inventaire" libelle="Inventaire" onPress={() => router.push('/inventaires')} />
            </View>
          </Section>

          {alertes.length > 0 && (
            <Section titre="À réapprovisionner">
              {alertes.slice(0, 5).map((a) => (
                <LigneListe key={a.id} icone="alerte" titre={a.produits?.nom ?? 'Produit'}
                  sousTitre={`Seuil : ${formaterQuantite(a.seuil)} ${a.produits?.unite ?? ''}`}
                  droite={`${formaterQuantite(a.quantite)} ${a.produits?.unite ?? ''}`}
                  onPress={() => router.push(`/produit/${a.produit_id}`)} />
              ))}
            </Section>
          )}

          {r.meilleurs_produits.length > 0 && (
            <Section titre="Meilleures ventes du mois">
              {r.meilleurs_produits.map((p) => (
                <LigneListe key={p.produit_id} titre={p.nom} sousTitre={`${formaterQuantite(p.quantite)} vendus`} droite={m(p.chiffre)}
                  onPress={() => router.push(`/produit/${p.produit_id}`)} />
              ))}
            </Section>
          )}
        </>
      )}
    </Ecran>
  );
}

function Tuile({ icone, libelle, valeur, sous, ton, onPress }: {
  icone: NomIcone; libelle: string; valeur: string; sous?: string; ton?: 'attention' | 'danger'; onPress?: () => void;
}) {
  const theme = useTheme();
  const couleur = ton === 'danger' ? theme.danger : ton === 'attention' ? theme.warning : theme.primary;
  return (
    <Carte style={styles.tuile} onPress={onPress}>
      <Icone nom={icone} taille={20} couleur={couleur} />
      <ThemedText type="small" themeColor="textSecondary">{libelle}</ThemedText>
      <ThemedText type="smallBold" style={{ fontSize: 17, color: ton ? couleur : theme.text }} numberOfLines={1} adjustsFontSizeToFit>{valeur}</ThemedText>
      {sous && <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{sous}</ThemedText>}
    </Carte>
  );
}

function Action({ icone, libelle, onPress }: { icone: NomIcone; libelle: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Carte style={[styles.tuile, { flexDirection: 'row', alignItems: 'center' }]} onPress={onPress}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icone nom={icone} taille={18} couleur={theme.primary} />
      </View>
      <ThemedText type="smallBold" style={{ flex: 1 }} numberOfLines={2}>{libelle}</ThemedText>
    </Carte>
  );
}

const styles = StyleSheet.create({
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + Spacing.one },
  tuile: { flexBasis: '47%', flexGrow: 1, gap: Spacing.one, borderRadius: Rayons.grand },
  graphe: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 44, marginTop: Spacing.two },
  barre: { flex: 1, borderRadius: 2 },
});

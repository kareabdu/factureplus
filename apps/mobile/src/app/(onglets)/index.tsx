import {
  chargerResume, formaterMontant, formaterQuantite, joursDePeriode, joursEssaiRestants, LIBELLES_PERIODES, libellePeriode,
  listerAlertes, periodePersonnalisee, periodePredefinie, PERIODES_PREDEFINIES, type CodePeriode, type Periode,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ChampDate } from '@/components/champ-date';
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
  const [periode, setPeriode] = useState<Periode>(lirePeriode);
  const [barreChoisie, setBarreChoisie] = useState<string | null>(null);

  function changerPeriode(p: Periode) {
    setPeriode(p);
    setBarreChoisie(null);
    memoriserPeriode(p);
  }

  const { donnees, chargement, erreur, recharger } = useDonnees(
    () => Promise.all([chargerResume(supabase, equipeId, periode.debut, periode.fin), listerAlertes(supabase, equipeId)]),
    [equipeId, periode.debut, periode.fin],
  );
  // Rafraîchit en revenant sur l'onglet (après une vente, un mouvement…)
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  if (chargement && !donnees) return <ChargementPlein />;
  const [r, alertes] = donnees ?? [null, []];
  const essai = profil && profil.abonnement_statut === 'essai' ? joursEssaiRestants(profil) : null;
  // Graphique : une barre par jour jusqu'à 62 jours, sinon une barre par mois
  const jours = joursDePeriode(periode);
  const parMois = jours.length > 62;
  const barres = (parMois ? [...new Set(jours.map((j) => j.slice(0, 7)))] : jours).map((cle) => ({
    cle,
    total: (r?.ventes_jours_periode ?? []).filter((v) => (parMois ? v.jour.slice(0, 7) : v.jour) === cle).reduce((t, v) => t + v.total, 0),
  }));
  const maxBarre = Math.max(1, ...barres.map((b) => b.total));
  const derniereVendue = [...barres].reverse().find((b) => b.total > 0)?.cle;
  const barreAffichee = barres.find((b) => b.cle === barreChoisie) ?? barres.find((b) => b.cle === derniereVendue) ?? barres[barres.length - 1];
  const libelleBarre = (cle: string, long = false) => parMois
    ? new Date(`${cle}-01T00:00:00`).toLocaleDateString('fr-FR', { month: long ? 'long' : 'short', year: 'numeric' })
    : new Date(`${cle}T00:00:00`).toLocaleDateString('fr-FR', long ? { day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });

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

      <FiltresPeriode periode={periode} onChange={changerPeriode} />

      {r && (
        <>
          <Carte style={{ backgroundColor: theme.primary, borderColor: theme.primary }}>
            <ThemedText type="small" style={{ color: theme.onPrimary, opacity: 0.85 }}>Ventes · {libellePeriode(periode)}</ThemedText>
            <ThemedText style={{ color: theme.onPrimary, fontSize: 30, lineHeight: 38, fontWeight: 700 }}>{m(r.ventes_periode)}</ThemedText>
            <ThemedText type="small" style={{ color: theme.onPrimary, opacity: 0.85 }}>
              {r.nb_factures_periode} facture{r.nb_factures_periode > 1 ? 's' : ''} · encaissé {m(r.encaisse_periode)}
            </ThemedText>
            {barres.length > 1 && barreAffichee && (
              <>
                {/* Montant de la barre choisie (par défaut : la dernière avec des ventes) */}
                <ThemedText type="smallBold" style={{ color: theme.onPrimary, marginTop: Spacing.two }}>
                  {libelleBarre(barreAffichee.cle)} · {m(barreAffichee.total)}
                </ThemedText>
                <View style={styles.graphe} accessibilityLabel="Ventes de la période : touchez une barre pour voir le montant">
                  {barres.map((b) => (
                    <Pressable key={b.cle} onPress={() => setBarreChoisie(b.cle)} style={styles.zoneBarre}
                      accessibilityRole="button" accessibilityLabel={`${libelleBarre(b.cle, true)} : ${m(b.total)}`}>
                      <View style={[styles.barre, {
                        height: `${Math.max(4, (b.total / maxBarre) * 100)}%`, backgroundColor: theme.onPrimary,
                        opacity: b.cle === barreAffichee.cle ? 1 : b.total ? 0.55 : 0.2,
                      }]} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </Carte>

          <View style={styles.grille}>
            <Tuile icone="tendance" libelle="Marge" valeur={m(r.marge_periode)} sous={libellePeriode(periode)} />
            <Tuile icone="paiement" libelle="Impayés" valeur={m(r.impayes)} sous="À ce jour" ton={r.impayes > 0 ? 'attention' : undefined}
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
            <Section titre={`Meilleures ventes · ${libellePeriode(periode)}`}>
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

// ---------------------------------------------------------------------------
// Période : filtres prédéfinis et personnalisés, mémorisés d'une ouverture à l'autre
// ---------------------------------------------------------------------------

const CLE_PERIODE = 'factureplus.periode';

function lirePeriode(): Periode {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(CLE_PERIODE) ?? 'null') as { code?: CodePeriode; debut?: string; fin?: string } | null;
    if (v?.code === 'personnalisee' && v.debut && v.fin) return periodePersonnalisee(v.debut, v.fin);
    if (v?.code && v.code !== 'personnalisee' && PERIODES_PREDEFINIES.includes(v.code)) return periodePredefinie(v.code);
  } catch {
    // préférence illisible : période par défaut
  }
  return periodePredefinie('ce_mois');
}

function memoriserPeriode(p: Periode) {
  try {
    globalThis.localStorage?.setItem(CLE_PERIODE, JSON.stringify(p.code === 'personnalisee' ? p : { code: p.code }));
  } catch {
    // stockage indisponible : la période ne sera pas retenue
  }
}

function FiltresPeriode({ periode, onChange }: { periode: Periode; onChange: (p: Periode) => void }) {
  const theme = useTheme();
  const codes: CodePeriode[] = [...PERIODES_PREDEFINIES, 'personnalisee'];
  return (
    <View style={{ gap: Spacing.two }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pastilles}>
        {codes.map((code) => {
          const choisi = periode.code === code;
          return (
            <Pressable key={code} accessibilityRole="radio" accessibilityState={{ selected: choisi }}
              onPress={() => onChange(code === 'personnalisee' ? periodePersonnalisee(periode.debut, periode.fin) : periodePredefinie(code))}
              style={[styles.pastille, { backgroundColor: choisi ? theme.primary : theme.backgroundElement, borderColor: choisi ? theme.primary : theme.border }]}>
              <ThemedText type="small" style={{ color: choisi ? theme.onPrimary : theme.text }}>{LIBELLES_PERIODES[code]}</ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      {periode.code === 'personnalisee' && (
        <View style={styles.dates}>
          <ThemedText type="small" themeColor="textSecondary">Du</ThemedText>
          <ChampDate libelle="Début de la période" valeur={periode.debut} onChange={(d) => onChange(periodePersonnalisee(d, periode.fin))} />
          <ThemedText type="small" themeColor="textSecondary">au</ThemedText>
          <ChampDate libelle="Fin de la période" valeur={periode.fin} onChange={(d) => onChange(periodePersonnalisee(periode.debut, d))} />
        </View>
      )}
    </View>
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
  graphe: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 48, marginTop: Spacing.one },
  zoneBarre: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barre: { width: '100%', borderRadius: 2 },
  pastilles: { gap: Spacing.two, paddingRight: Spacing.three },
  pastille: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Rayons.plein, borderWidth: 1, minHeight: 40, justifyContent: 'center' },
  dates: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
});

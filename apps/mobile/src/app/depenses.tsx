import {
  formaterMontant, LIBELLES_CATEGORIES_DEPENSE, libellePeriode, listerDepenses, periodeParDefaut, resumerDepenses, type Periode,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useState } from 'react';
import { View } from 'react-native';

import { FiltresPeriode } from '@/components/filtres-periode';
import { ThemedText } from '@/components/themed-text';
import { Bouton, Carte, Ecran, ErreurChargement, LigneListe, Recherche, Section, Vide } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateCourte } from '@/lib/dates';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Depenses() {
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const [periode, setPeriode] = useState<Periode>(() => periodeParDefaut());
  const [recherche, setRecherche] = useState('');
  const r = useDeferredValue(recherche);
  const { donnees, chargement, erreur, recharger } = useDonnees(
    () => listerDepenses(supabase, equipeId, { debut: periode.debut, fin: periode.fin, recherche: r }),
    [equipeId, periode.debut, periode.fin, r],
  );
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));
  const resume = resumerDepenses(donnees ?? []);

  return (
    <Ecran enTete rafraichir={recharger}>
      <FiltresPeriode periode={periode} onChange={setPeriode} />

      <Carte>
        <ThemedText type="small" themeColor="textSecondary">Dépenses · {libellePeriode(periode)}</ThemedText>
        <ThemedText style={{ fontSize: 28, lineHeight: 36, fontWeight: 700 }} numberOfLines={1} adjustsFontSizeToFit>{m(resume.total)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{resume.nombre} dépense{resume.nombre > 1 ? 's' : ''}</ThemedText>
        {resume.parCategorie.slice(0, 4).map((c) => (
          <View key={c.categorie} style={{ gap: 4, marginTop: Spacing.one }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
              <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>{c.libelle}</ThemedText>
              <ThemedText type="smallBold">{m(c.montant)}</ThemedText>
            </View>
            <View style={{ height: 6, borderRadius: Rayons.plein, backgroundColor: theme.backgroundSelected, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(2, Math.round(c.part * 100))}%`, height: '100%', backgroundColor: theme.primary }} />
            </View>
          </View>
        ))}
      </Carte>

      <Bouton titre="Nouvelle dépense" icone="ajouter" onPress={() => router.push('/depense/editer')} />
      <Recherche valeur={recherche} onChange={setRecherche} placeholder="Commerçant, description…" />
      {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
      {!chargement && donnees?.length === 0 && (
        <Vide icone="depense" titre={recherche ? 'Aucune dépense trouvée' : 'Aucune dépense sur cette période'}
          texte="Loyer, salaires, transport… notez vos dépenses pour suivre vos charges." />
      )}
      {(donnees?.length ?? 0) > 0 && (
        <Section titre="Détail">
          {donnees!.map((d) => (
            <LigneListe key={d.id} icone={d.recu_chemin ? 'recu' : 'depense'} titre={d.commercant}
              sousTitre={`${dateCourte(d.date_depense)} · ${LIBELLES_CATEGORIES_DEPENSE[d.categorie]}`}
              droite={m(d.montant)} onPress={() => router.push({ pathname: '/depense/editer', params: { id: d.id } })} />
          ))}
        </Section>
      )}
    </Ecran>
  );
}

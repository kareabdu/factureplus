import {
  COULEURS_DOCUMENT, documentExemple, estCouleurValide, htmlDocument, MODELES_DOCUMENT, type ModeleDocument, type Parametres,
} from '@factureplus/core';
import * as Print from 'expo-print';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icone } from '@/components/icone';
import { SelecteurCouleur } from '@/components/selecteur-couleur';
import { ThemedText } from '@/components/themed-text';
import { Bouton } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signalerErreur } from '@/lib/confirmer';

/**
 * Choix du modèle de facture (4 mises en page) et de sa couleur, avec aperçu PDF d'une facture d'exemple.
 * Les miniatures schématisent chaque en-tête dans la couleur choisie.
 */
export function ChoixModele({ modele, couleur, parametres, onChange }: {
  modele: ModeleDocument;
  couleur: string;
  parametres: Parametres;
  onChange: (c: { modele_document?: ModeleDocument; couleur_document?: string }) => void;
}) {
  const theme = useTheme();
  const [apercu, setApercu] = useState(false);
  const accent = estCouleurValide(couleur) ? couleur : '#147A2E';

  async function voirApercu() {
    setApercu(true);
    try {
      const { document, lignes } = documentExemple(parametres);
      await Print.printAsync({ html: htmlDocument({ document, lignes, parametres, modele, couleur: accent }) });
    } catch (e) {
      // Fermeture de l'aperçu sans imprimer : pas une erreur
      if (!/cancel|annul/i.test((e as Error).message)) signalerErreur(e, 'Aperçu impossible');
    } finally {
      setApercu(false);
    }
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={styles.grille}>
        {MODELES_DOCUMENT.map((mo) => {
          const choisi = mo.code === modele;
          return (
            <Pressable key={mo.code} onPress={() => onChange({ modele_document: mo.code })}
              accessibilityRole="radio" accessibilityState={{ selected: choisi }} accessibilityLabel={`Modèle ${mo.libelle} : ${mo.description}`}
              style={[styles.carte, { borderColor: choisi ? accent : theme.border, borderWidth: choisi ? 2 : 1, backgroundColor: theme.backgroundElement }]}>
              <Miniature modele={mo.code} couleur={accent} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                {choisi && <Icone nom="valider" taille={16} couleur={accent} />}
                <ThemedText type="smallBold" numberOfLines={1} style={{ flexShrink: 1 }}>{mo.libelle}</ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: Spacing.two }}>
        <ThemedText type="smallBold">Couleur</ThemedText>
        <View style={styles.couleurs}>
          {COULEURS_DOCUMENT.map((c) => {
            const choisie = c.toLowerCase() === accent.toLowerCase();
            return (
              <Pressable key={c} onPress={() => onChange({ couleur_document: c })}
                accessibilityRole="radio" accessibilityState={{ selected: choisie }} accessibilityLabel={`Couleur ${c}`}
                style={[styles.pastille, { backgroundColor: c, borderColor: choisie ? theme.text : 'transparent' }]}>
                {choisie && <Icone nom="valider" taille={16} couleur="#FFFFFF" />}
              </Pressable>
            );
          })}
        </View>
        {/* Couleur libre : palette native (iOS) ou grille de couleurs (Android) */}
        <SelecteurCouleur couleur={accent} onChange={(c) => { if (estCouleurValide(c)) onChange({ couleur_document: c }); }}
          libelle="Autre couleur" />
      </View>

      <Bouton titre="Aperçu d'une facture" icone="document" variante="secondaire" onPress={voirApercu} chargement={apercu} />
    </View>
  );
}

/** Schéma simplifié de l'en-tête de chaque modèle (proportions d'une page A4). */
function Miniature({ modele, couleur }: { modele: ModeleDocument; couleur: string }) {
  const trait = (largeur: number | `${number}%`, epaisseur = 3, fond = '#C9D0D6') =>
    <View style={{ width: largeur, height: epaisseur, borderRadius: 1, backgroundColor: fond }} />;
  const carre = <View style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: couleur }} />;
  const textes = (alignement: 'flex-start' | 'flex-end' = 'flex-start') => (
    <View style={{ gap: 2, alignItems: alignement }}>{trait(22, 3, '#6B7680')}{trait(16)}{trait(18)}</View>
  );
  const tableau = (
    <View style={{ gap: 3, marginTop: 6 }}>
      {trait('100%', 5, couleur)}{trait('100%', 2)}{trait('100%', 2)}
      <View style={{ alignItems: 'flex-end', gap: 2, marginTop: 2 }}>{trait(28, 2)}{trait(28, 2, couleur)}</View>
    </View>
  );

  let entete;
  switch (modele) {
    case 'bandeau':
      entete = (
        <>
          <View style={styles.rangee}><View style={styles.rangee}>{carre}{textes()}</View>{textes('flex-end')}</View>
          <View style={[styles.rangee, { marginTop: 6 }]}>{trait(14)}{trait(14)}{trait(14)}{trait(14, 3, couleur)}</View>
        </>
      );
      break;
    case 'client':
      entete = (
        <>
          <View style={styles.rangee}>{textes()}{carre}</View>
          <View style={[styles.rangee, { marginTop: 6 }]}>{textes()}<View style={{ gap: 2, alignItems: 'flex-end' }}>{trait(16)}{trait(20)}{trait(16, 3, couleur)}</View></View>
        </>
      );
      break;
    case 'moderne':
      entete = (
        <>
          <View style={[styles.rangee, { backgroundColor: '#EEF1F3', margin: -6, marginBottom: 0, padding: 6 }]}>
            <View style={styles.rangee}>{carre}{textes()}</View>
            <View style={{ gap: 2, alignItems: 'flex-end' }}>{trait(20, 4, couleur)}{trait(16)}{trait(14, 3, couleur)}</View>
          </View>
          <View style={{ marginTop: 6 }}>{textes()}</View>
        </>
      );
      break;
    default:
      entete = (
        <>
          <View style={styles.rangee}><View style={styles.rangee}>{carre}{textes()}</View>
            <View style={{ gap: 2, alignItems: 'flex-end' }}>{trait(10, 2, couleur)}{trait(22, 4, '#6B7680')}{trait(14)}{trait(16, 3, couleur)}</View>
          </View>
          <View style={{ marginTop: 6 }}>{textes()}</View>
        </>
      );
  }

  return (
    <View style={[styles.page, { borderTopColor: couleur }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {entete}
      {tableau}
    </View>
  );
}

const styles = StyleSheet.create({
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + Spacing.one },
  carte: { flexBasis: '46%', flexGrow: 1, borderRadius: Rayons.moyen, padding: Spacing.two, gap: Spacing.two, alignItems: 'stretch' },
  page: { aspectRatio: 0.72, backgroundColor: '#FFFFFF', borderTopWidth: 3, borderRadius: 3, padding: 6, overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)' },
  rangee: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  couleurs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pastille: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});

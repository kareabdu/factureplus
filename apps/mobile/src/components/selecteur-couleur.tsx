import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Android (et aperçu web) : Android n'a pas de sélecteur de couleur système. Une feuille s'ouvre avec
 * une grille de couleurs organisée comme l'onglet « Grille » de la palette iOS : une rangée de gris,
 * puis chaque teinte du plus foncé au plus clair.
 */
export function SelecteurCouleur({ couleur, onChange, libelle = 'Autre couleur' }: {
  couleur: string;
  onChange: (couleur: string) => void;
  libelle?: string;
}) {
  const theme = useTheme();
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOuvert(true)} accessibilityRole="button" accessibilityLabel={`${libelle} : ${couleur}`}
        style={({ pressed }) => [styles.ligne, { opacity: pressed ? 0.7 : 1 }]}>
        <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>{libelle}</ThemedText>
        <View style={[styles.puit, { borderColor: theme.border }]}>
          <View style={[styles.puitInterieur, { backgroundColor: couleur }]} />
        </View>
      </Pressable>

      <Modal visible={ouvert} transparent animationType="slide" onRequestClose={() => setOuvert(false)}>
        <Pressable style={styles.voile} onPress={() => setOuvert(false)} accessibilityLabel="Fermer" />
        <SafeAreaView edges={['bottom']} style={[styles.feuille, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.entete}>
            <View style={[styles.apercu, { backgroundColor: couleur }]} />
            <ThemedText type="smallBold" style={{ flex: 1, textAlign: 'center', fontSize: 18 }}>Couleurs</ThemedText>
            <Pressable onPress={() => setOuvert(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fermer">
              <Icone nom="fermer" taille={24} couleur={theme.text} />
            </Pressable>
          </View>
          <View style={styles.grille} accessibilityRole="radiogroup">
            {GRILLE.map((rangee, i) => (
              <View key={i} style={styles.rangee}>
                {rangee.map((c) => {
                  const choisie = c === couleur.toUpperCase();
                  return (
                    <Pressable key={c} onPress={() => { onChange(c); setOuvert(false); }}
                      accessibilityRole="radio" accessibilityState={{ selected: choisie }} accessibilityLabel={`Couleur ${c}`}
                      style={[styles.case, { backgroundColor: c }, choisie && { borderWidth: 3, borderColor: theme.text }]} />
                  );
                })}
              </View>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Grille : 12 colonnes × 10 rangées (gris, puis 12 teintes × 9 luminosités)
// ---------------------------------------------------------------------------

const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

function hsl(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${hex(f(0) * 255)}${hex(f(8) * 255)}${hex(f(4) * 255)}`.toUpperCase();
}

const TEINTES = [195, 215, 250, 280, 330, 5, 22, 36, 46, 56, 70, 100];
const LUMINOSITES = [16, 24, 33, 42, 51, 61, 72, 83, 92];

const GRILLE: string[][] = [
  Array.from({ length: 12 }, (_, i) => {
    const v = Math.round(255 - (255 * i) / 11);
    return `#${hex(v)}${hex(v)}${hex(v)}`.toUpperCase();
  }),
  ...LUMINOSITES.map((l) => TEINTES.map((h) => hsl(h, l < 30 ? 100 : 90, l))),
];

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  puit: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, padding: 3 },
  puitInterieur: { flex: 1, borderRadius: 12 },
  voile: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  feuille: { borderTopLeftRadius: Rayons.grand + 8, borderTopRightRadius: Rayons.grand + 8, padding: Spacing.three, gap: Spacing.three },
  entete: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  apercu: { width: 28, height: 28, borderRadius: 6 },
  grille: { borderRadius: Rayons.moyen, overflow: 'hidden' },
  rangee: { flexDirection: 'row' },
  case: { flex: 1, aspectRatio: 1 },
});

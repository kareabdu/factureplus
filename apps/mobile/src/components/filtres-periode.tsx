import { LIBELLES_PERIODES, periodePersonnalisee, periodePredefinie, PERIODES_PREDEFINIES, type CodePeriode, type Periode } from '@factureplus/core';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ChampDate } from '@/components/champ-date';
import { ThemedText } from '@/components/themed-text';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Périodes prédéfinies (pastilles défilantes) et période personnalisée (deux dates). */
export function FiltresPeriode({ periode, onChange }: { periode: Periode; onChange: (p: Periode) => void }) {
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

const styles = StyleSheet.create({
  pastilles: { gap: Spacing.two, paddingRight: Spacing.three },
  pastille: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Rayons.plein, borderWidth: 1, minHeight: 40, justifyContent: 'center' },
  dates: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
});

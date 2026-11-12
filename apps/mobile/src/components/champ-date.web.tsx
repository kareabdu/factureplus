import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateCourte, versDate, versIso } from '@/lib/dates';

export { dateCourte, versDate, versIso };

/**
 * Version web (aperçu Expo dans un navigateur) : le calendrier système iOS / Android n'existe pas,
 * on superpose un <input type="date"> transparent au libellé : un clic ouvre le calendrier du navigateur.
 */
export function ChampDate({ valeur, onChange, pleineLargeur = false, discret = false, libelle }: {
  valeur: string;
  onChange: (iso: string) => void;
  pleineLargeur?: boolean;
  discret?: boolean;
  libelle: string;
}) {
  const theme = useTheme();
  return (
    <View style={[
      discret ? styles.discret : [styles.champ, { borderColor: theme.border, backgroundColor: theme.backgroundElement }],
      pleineLargeur && styles.large,
    ]}>
      <ThemedText type={discret ? 'small' : 'default'} themeColor={discret ? 'textSecondary' : 'text'}>{dateCourte(valeur)}</ThemedText>
      <input
        type="date"
        value={valeur}
        aria-label={libelle}
        onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 0 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  champ: { minHeight: 50, borderWidth: 1, borderRadius: Rayons.moyen, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  large: { alignSelf: 'stretch' },
  discret: { paddingVertical: Spacing.one },
});

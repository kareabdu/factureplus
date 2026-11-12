import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateCourte, versDate, versIso } from '@/lib/dates';
import { useThemeApp } from '@/lib/theme';

export { dateCourte, versDate, versIso };

/**
 * Sélecteur de date natif. iOS : pastille compacte qui ouvre le calendrier en surimpression.
 * Android : champ qui ouvre le calendrier système.
 */
export function ChampDate({ valeur, onChange, pleineLargeur = false, discret = false, libelle }: {
  valeur: string;
  onChange: (iso: string) => void;
  /** Champ sur toute la largeur (échéance) plutôt qu'une simple pastille (date du document) */
  pleineLargeur?: boolean;
  /** Texte gris, sans cadre (en-tête du document) */
  discret?: boolean;
  libelle: string;
}) {
  const theme = useTheme();
  const { schema } = useThemeApp();
  const date = versDate(valeur);
  const changer = (e: DateTimePickerEvent, d?: Date) => {
    if (e.type === 'set' && d) onChange(versIso(d));
  };

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={date}
        mode="date"
        display="compact"
        locale="fr-FR"
        accentColor={theme.primary}
        themeVariant={schema === 'sombre' ? 'dark' : 'light'}
        onChange={changer}
        accessibilityLabel={libelle}
        style={pleineLargeur ? styles.iosLarge : undefined}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${libelle} : ${dateCourte(valeur)}`}
      onPress={() => DateTimePickerAndroid.open({ value: date, mode: 'date', onChange: changer })}
      style={({ pressed }) => [
        discret ? styles.discret : [styles.champ, { borderColor: theme.border, backgroundColor: theme.backgroundElement }],
        pleineLargeur && styles.large,
        { opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText type={discret ? 'small' : 'default'} themeColor={discret ? 'textSecondary' : 'text'}>{dateCourte(valeur)}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  champ: { minHeight: 50, borderWidth: 1, borderRadius: Rayons.moyen, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  large: { alignSelf: 'stretch' },
  discret: { paddingVertical: Spacing.one },
  iosLarge: { alignSelf: 'center' },
});

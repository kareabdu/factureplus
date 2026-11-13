import { messageAbonnement } from '@factureplus/core';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEquipe } from '@/lib/espace';

/** Fin d'essai ou d'abonnement proche, ou accès expiré : bandeau qui mène à l'abonnement. */
export function BandeauAbonnement() {
  const { abonnement } = useEquipe();
  const theme = useTheme();
  const message = abonnement ? messageAbonnement(abonnement) : null;
  if (!abonnement || !message) return null;
  const expire = abonnement.etat === 'expire';
  const couleur = expire ? theme.danger : theme.warning;

  return (
    <Pressable onPress={() => router.push('/abonnement')} accessibilityRole="button"
      accessibilityLabel={`${message} ${expire ? "S'abonner" : 'Voir les offres'}`}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three,
        borderRadius: Rayons.moyen, borderWidth: 1, borderColor: couleur, backgroundColor: theme.backgroundElement,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Icone nom={expire ? 'alerte' : 'abonnement'} taille={20} couleur={couleur} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="small">{message}</ThemedText>
        <ThemedText type="smallBold" style={{ color: couleur }}>{expire ? "S'abonner" : 'Voir les offres'}</ThemedText>
      </View>
      <Icone nom="suivant" taille={16} couleur={theme.textSecondary} />
    </Pressable>
  );
}

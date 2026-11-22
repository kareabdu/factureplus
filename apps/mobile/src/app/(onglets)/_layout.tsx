import { NativeTabs } from 'expo-router/native-tabs';
import { Platform, useWindowDimensions } from 'react-native';

import { ICONES } from '@/components/icone';
import { OngletsBas } from '@/components/onglets-bas';
import { useTheme } from '@/hooks/use-theme';

/**
 * La barre d'onglets native n'est en bas que sur un téléphone classique : dans le navigateur et sur iPad (iOS 18+)
 * elle se place en haut,
 * sur iPhone Duo (écran large, proportions proches de l'iPad) elle devient verticale à droite et recouvre le
 * bouton « + ». Ces écrans prennent la barre JavaScript en bas, sans option native pour la déplacer.
 */
export default function LayoutOnglets() {
  const { width, height } = useWindowDimensions();
  const ecranLarge = Math.min(width, height) / Math.max(width, height) > 0.6;
  const barreBas = Platform.OS === 'web' || (Platform.OS === 'ios' && (Platform.isPad || ecranLarge));
  return barreBas ? <OngletsBas /> : <OngletsNatifs />;
}

function OngletsNatifs() {
  const theme = useTheme();
  return (
    <NativeTabs
      labelVisibilityMode="labeled"
      backgroundColor={theme.backgroundElement}
      indicatorColor={theme.primarySoft}
      iconColor={{ default: theme.textSecondary, selected: theme.primary }}
      labelStyle={{ default: { color: theme.textSecondary }, selected: { color: theme.primary, fontWeight: '600' } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONES.accueil.ios} md={ICONES.accueil.android} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="produits">
        <NativeTabs.Trigger.Label>Produits</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONES.produits.ios} md={ICONES.produits.android} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ventes">
        <NativeTabs.Trigger.Label>Ventes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONES.ventes.ios} md={ICONES.ventes.android} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plus">
        <NativeTabs.Trigger.Label>Plus</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONES.plus.ios} md={ICONES.plus.android} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

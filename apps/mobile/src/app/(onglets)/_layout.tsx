import { NativeTabs } from 'expo-router/native-tabs';

import { ICONES } from '@/components/icone';
import { useTheme } from '@/hooks/use-theme';

/**
 * Barre d'onglets classique (opaque) sur iOS 26 aussi : app.json → ios.infoPlist.UIDesignRequiresCompatibility.
 * La barre en verre d'iOS 26 restait parfois sombre au-dessus d'un contenu clair (jusqu'au défilement suivant).
 */
export default function LayoutOnglets() {
  const theme = useTheme();
  return (
    <NativeTabs
      backgroundColor={theme.backgroundElement}
      disableTransparentOnScrollEdge
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

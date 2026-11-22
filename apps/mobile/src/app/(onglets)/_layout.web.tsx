import { Tabs } from 'expo-router/js-tabs';

import { Icone, type NomIcone } from '@/components/icone';
import { useTheme } from '@/hooks/use-theme';

const ONGLETS: { nom: string; titre: string; icone: NomIcone }[] = [
  { nom: 'index', titre: 'Accueil', icone: 'accueil' },
  { nom: 'produits', titre: 'Produits', icone: 'produits' },
  { nom: 'ventes', titre: 'Ventes', icone: 'ventes' },
  { nom: 'plus', titre: 'Plus', icone: 'plus' },
];

/**
 * Navigateur (web mobile) : les onglets natifs s'affichent en haut de page ; ici, barre d'onglets en bas
 * comme dans l'application (mêmes onglets, mêmes icônes que _layout.tsx).
 */
export default function LayoutOnglets() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'bottom',
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.backgroundElement, borderTopColor: theme.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      {ONGLETS.map((o) => (
        <Tabs.Screen key={o.nom} name={o.nom} options={{
          title: o.titre,
          tabBarIcon: ({ color, size }) => <Icone nom={o.icone} taille={size} couleur={color} />,
        }} />
      ))}
    </Tabs>
  );
}

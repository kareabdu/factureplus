import { Tabs } from 'expo-router/js-tabs';

import { Icone, type NomIcone } from '@/components/icone';
import { ContexteOngletsBas } from '@/components/onglets-contexte';
import { useTheme } from '@/hooks/use-theme';

const ONGLETS: { nom: string; titre: string; icone: NomIcone }[] = [
  { nom: 'index', titre: 'Accueil', icone: 'accueil' },
  { nom: 'produits', titre: 'Produits', icone: 'produits' },
  { nom: 'ventes', titre: 'Ventes', icone: 'ventes' },
  { nom: 'plus', titre: 'Plus', icone: 'plus' },
];

/**
 * Barre d'onglets en bas, dessinée en JavaScript (mêmes onglets et icônes que les onglets natifs).
 * Utilisée là où la barre native n'est pas en bas : navigateur, iPad (en haut, iOS 18+) et iPhone Duo (verticale à droite).
 */
export function OngletsBas() {
  const theme = useTheme();
  return (
    <ContexteOngletsBas.Provider value>
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
    </ContexteOngletsBas.Provider>
  );
}

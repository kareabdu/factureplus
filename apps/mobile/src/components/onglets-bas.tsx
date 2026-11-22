import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomIcone } from '@/components/icone';
import { ContexteOngletsBas } from '@/components/onglets-contexte';
import { useTheme } from '@/hooks/use-theme';

/** Hauteur de la barre, hors zone sûre basse (icône, libellé et marges). */
const HAUTEUR = 64;

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
  const { bottom } = useSafeAreaInsets();
  return (
    <ContexteOngletsBas.Provider value>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'bottom',
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        // Hauteur explicite : avec la hauteur par défaut, les libellés étaient coupés dans les navigateurs mobiles
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: theme.backgroundElement, borderTopColor: theme.border,
          height: HAUTEUR + bottom, paddingTop: 6, paddingBottom: bottom + 6,
        },
        tabBarItemStyle: { height: HAUTEUR - 12 },
        tabBarIconStyle: { width: 26, height: 26 },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
      }}>
      {ONGLETS.map((o) => (
        <Tabs.Screen key={o.nom} name={o.nom} options={{
          title: o.titre,
          tabBarIcon: ({ color }) => <Icone nom={o.icone} taille={24} couleur={color} />,
        }} />
      ))}
    </Tabs>
    </ContexteOngletsBas.Provider>
  );
}

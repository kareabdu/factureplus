import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ChargementPlein } from '@/components/ui';
import { Fournisseurs, useEquipe, useSession } from '@/lib/espace';
import { ThemeApp, useThemeApp } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeApp>
      <ThemeNavigation>
        <Fournisseurs>
          <Navigation />
        </Fournisseurs>
        <AnimatedSplashOverlay />
      </ThemeNavigation>
    </ThemeApp>
  );
}

function ThemeNavigation({ children }: { children: ReactNode }) {
  const { schema, couleurs } = useThemeApp();
  const base = schema === 'sombre' ? DarkTheme : DefaultTheme;
  const theme: Theme = {
    ...base,
    dark: schema === 'sombre',
    colors: {
      ...base.colors,
      primary: couleurs.primary,
      background: couleurs.background,
      card: couleurs.backgroundElement,
      text: couleurs.text,
      border: couleurs.border,
      notification: couleurs.danger,
    },
  };
  return (
    <ThemeProvider value={theme}>
      <StatusBar style={schema === 'sombre' ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

/**
 * Trois états :
 *  - non connecté             → connexion / inscription / mot de passe oublié
 *  - connecté sans entreprise → création de l'entreprise
 *  - connecté avec entreprise → onglets et écrans de l'application
 */
function Navigation() {
  const { session, chargement: chargementSession } = useSession();
  const { equipe, chargement, erreur } = useEquipe();
  const connecte = !!session;

  if (chargementSession || (connecte && chargement && !erreur)) return <ChargementPlein />;

  const pret = connecte && !!equipe;
  const modal = { presentation: 'modal' as const, headerShown: true };

  return (
    <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={!connecte}>
        <Stack.Screen name="connexion" />
        <Stack.Screen name="inscription" />
        <Stack.Screen name="mot-de-passe-oublie" />
      </Stack.Protected>

      <Stack.Protected guard={connecte && !equipe}>
        <Stack.Screen name="bienvenue" />
      </Stack.Protected>

      <Stack.Protected guard={pret}>
        <Stack.Screen name="(onglets)" />
        <Stack.Screen name="produit/[id]" options={{ headerShown: true, title: 'Produit' }} />
        <Stack.Screen name="produit/editer" options={{ ...modal, title: 'Produit' }} />
        <Stack.Screen name="produit/mouvement" options={{ ...modal, title: 'Mouvement de stock' }} />
        <Stack.Screen name="document/[id]" options={{ headerShown: true, title: 'Document' }} />
        <Stack.Screen name="document/editer" options={{ headerShown: true, title: 'Document' }} />
        <Stack.Screen name="document/reglement" options={{ ...modal, title: 'Encaisser' }} />
        <Stack.Screen name="document/article" options={{ headerShown: true, title: 'Article' }} />
        <Stack.Screen name="achats" options={{ headerShown: true, title: 'Achats' }} />
        <Stack.Screen name="achat/[id]" options={{ headerShown: true, title: 'Achat' }} />
        <Stack.Screen name="achat/editer" options={{ headerShown: true, title: 'Achat' }} />
        <Stack.Screen name="mouvements" options={{ headerShown: true, title: 'Mouvements de stock' }} />
        <Stack.Screen name="inventaires" options={{ headerShown: true, title: 'Inventaires' }} />
        <Stack.Screen name="inventaire/[id]" options={{ headerShown: true, title: 'Inventaire' }} />
        <Stack.Screen name="alertes" options={{ headerShown: true, title: 'Alertes de stock' }} />
        <Stack.Screen name="clients" options={{ headerShown: true, title: 'Clients' }} />
        <Stack.Screen name="client/[id]" options={{ headerShown: true, title: 'Client' }} />
        <Stack.Screen name="fournisseurs" options={{ headerShown: true, title: 'Fournisseurs' }} />
        <Stack.Screen name="fournisseur/[id]" options={{ headerShown: true, title: 'Fournisseur' }} />
        <Stack.Screen name="categories" options={{ headerShown: true, title: 'Catégories' }} />
        <Stack.Screen name="parametres" options={{ headerShown: true, title: 'Entreprise' }} />
        <Stack.Screen name="compte" options={{ headerShown: true, title: 'Mon compte' }} />
        <Stack.Screen name="depenses" options={{ headerShown: true, title: 'Dépenses' }} />
        <Stack.Screen name="depense/editer" options={{ ...modal, title: 'Dépense' }} />
        <Stack.Screen name="abonnement" options={{ headerShown: true, title: 'Abonnement' }} />
        <Stack.Screen name="admin" options={{ headerShown: true, title: 'Administration' }} />
        <Stack.Screen name="utilisateur/[id]" options={{ headerShown: true, title: 'Compte' }} />
        <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="choisir/produit" options={{ ...modal, title: 'Choisir un produit' }} />
        <Stack.Screen name="choisir/client" options={{ headerShown: true, title: 'Clients' }} />
        <Stack.Screen name="choisir/fournisseur" options={{ ...modal, title: 'Choisir un fournisseur' }} />
      </Stack.Protected>
    </Stack>
  );
}

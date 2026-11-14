// localStorage (expo-sqlite) doit être installé avant de lire la préférence
import '@/lib/stockage';

import {
  lirePreferenceTheme,
  memoriserPreferenceTheme,
  themeEffectif,
  type PreferenceTheme,
} from '@factureplus/core';
import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import { Colors, type Couleurs } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface EtatTheme {
  preference: PreferenceTheme;
  changerPreference: (p: PreferenceTheme) => void;
  /** Thème effectivement affiché */
  schema: 'clair' | 'sombre';
  couleurs: Couleurs;
}

const ThemeContext = createContext<EtatTheme | null>(null);

/** Apparence de l'application : automatique (appareil), clair ou sombre, mémorisée. */
export function ThemeApp({ children }: { children: ReactNode }) {
  const appareil = useColorScheme();
  const [preference, setPreference] = useState<PreferenceTheme>(lirePreferenceTheme);

  // Le thème choisi s'impose aussi aux éléments natifs (barre d'onglets en verre d'iOS 26, sélecteurs,
  // alertes) : sans cela, un iPhone en mode sombre les dessine en sombre sous une application claire.
  useLayoutEffect(() => {
    Appearance.setColorScheme(preference === 'auto' ? 'auto' : preference === 'sombre' ? 'dark' : 'light');
  }, [preference]);

  const valeur = useMemo<EtatTheme>(() => {
    const schema = themeEffectif(preference, appareil === 'dark');
    return {
      preference,
      changerPreference: (p) => {
        memoriserPreferenceTheme(p);
        setPreference(p);
      },
      schema,
      couleurs: schema === 'sombre' ? Colors.dark : Colors.light,
    };
  }, [preference, appareil]);

  return <ThemeContext.Provider value={valeur}>{children}</ThemeContext.Provider>;
}

export function useThemeApp(): EtatTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeApp doit être utilisé dans <ThemeApp>.');
  return ctx;
}

/**
 * Direction artistique StockTracker : palette commune au web et au mobile.
 * Vert repris de l'ancienne app (#147A2E) pour la continuité de marque.
 * Le web reprend ces valeurs dans apps/web/app/globals.css : toute modification ici doit y être reportée.
 */

export interface Palette {
  fond: string;
  surface: string;
  surfaceRetrait: string;
  texte: string;
  texteDiscret: string;
  bordure: string;
  primaire: string;
  primaireSurvol: string;
  surPrimaire: string;
  primaireDoux: string;
  accent: string;
  info: string;
  infoDoux: string;
  danger: string;
  dangerDoux: string;
  alerte: string;
  alerteDoux: string;
}

export const PALETTES: Record<"clair" | "sombre", Palette> = {
  clair: {
    fond: "#F4F6F4",
    surface: "#FFFFFF",
    surfaceRetrait: "#EEF2EE",
    texte: "#121A14",
    texteDiscret: "#5A675D",
    bordure: "#DFE5E0",
    primaire: "#147A2E",
    primaireSurvol: "#0F6324",
    surPrimaire: "#FFFFFF",
    primaireDoux: "#E3F4E7",
    accent: "#2FB457",
    info: "#1D5FBF",
    infoDoux: "#E8F0FC",
    danger: "#C0262D",
    dangerDoux: "#FDECEC",
    alerte: "#9A5B00",
    alerteDoux: "#FFF3DF",
  },
  sombre: {
    fond: "#0B110C",
    surface: "#141C16",
    surfaceRetrait: "#101712",
    texte: "#E7EEE8",
    texteDiscret: "#95A498",
    bordure: "#243027",
    primaire: "#3CCB66",
    primaireSurvol: "#5AD97F",
    surPrimaire: "#06140A",
    primaireDoux: "#16361F",
    accent: "#2FB457",
    info: "#7FB0FF",
    infoDoux: "#16243A",
    danger: "#FF8A8A",
    dangerDoux: "#3A1B1D",
    alerte: "#FFC46B",
    alerteDoux: "#3A2A10",
  },
};

export const RAYONS = { petit: 8, moyen: 12, grand: 16, plein: 999 } as const;

export type PreferenceTheme = "auto" | "clair" | "sombre";

export const LIBELLES_THEMES: Record<PreferenceTheme, string> = {
  auto: "Automatique",
  clair: "Clair",
  sombre: "Sombre",
};

const CLE_THEME = "stocktracker.theme";

export function lirePreferenceTheme(): PreferenceTheme {
  try {
    const v = globalThis.localStorage?.getItem(CLE_THEME);
    return v === "clair" || v === "sombre" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function memoriserPreferenceTheme(p: PreferenceTheme): void {
  try {
    if (p === "auto") globalThis.localStorage?.removeItem(CLE_THEME);
    else globalThis.localStorage?.setItem(CLE_THEME, p);
  } catch {
    // stockage indisponible : la préférence ne sera pas retenue
  }
}

export function themeEffectif(p: PreferenceTheme, appareilSombre: boolean): "clair" | "sombre" {
  return p === "auto" ? (appareilSombre ? "sombre" : "clair") : p;
}

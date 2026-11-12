/**
 * Périodes du tableau de bord : prédéfinies (aujourd'hui, 7 / 30 jours, mois, année…) ou personnalisées.
 * Dates au format « AAAA-MM-JJ », bornes incluses, calculées en heure locale.
 */

export type CodePeriode =
  | "aujourdhui" | "7_jours" | "30_jours" | "ce_mois" | "mois_dernier" | "cette_annee" | "annee_derniere" | "personnalisee";

export interface Periode {
  code: CodePeriode;
  debut: string;
  fin: string;
}

export const LIBELLES_PERIODES: Record<CodePeriode, string> = {
  aujourdhui: "Aujourd'hui",
  "7_jours": "7 jours",
  "30_jours": "30 jours",
  ce_mois: "Ce mois",
  mois_dernier: "Mois dernier",
  cette_annee: "Cette année",
  annee_derniere: "Année dernière",
  personnalisee: "Personnalisée",
};

/** Ordre d'affichage des filtres */
export const PERIODES_PREDEFINIES: Exclude<CodePeriode, "personnalisee">[] = [
  "aujourdhui", "7_jours", "30_jours", "ce_mois", "mois_dernier", "cette_annee", "annee_derniere",
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Bornes d'une période prédéfinie à la date `aujourdhui`. */
export function periodePredefinie(code: Exclude<CodePeriode, "personnalisee">, aujourdhui = new Date()): Periode {
  const a = aujourdhui.getFullYear();
  const m = aujourdhui.getMonth();
  const j = aujourdhui.getDate();
  const jour = (annee: number, mois: number, d: number) => iso(new Date(annee, mois, d));
  switch (code) {
    case "aujourdhui": return { code, debut: jour(a, m, j), fin: jour(a, m, j) };
    case "7_jours": return { code, debut: jour(a, m, j - 6), fin: jour(a, m, j) };
    case "30_jours": return { code, debut: jour(a, m, j - 29), fin: jour(a, m, j) };
    case "ce_mois": return { code, debut: jour(a, m, 1), fin: jour(a, m + 1, 0) };
    case "mois_dernier": return { code, debut: jour(a, m - 1, 1), fin: jour(a, m, 0) };
    case "cette_annee": return { code, debut: jour(a, 0, 1), fin: jour(a, 11, 31) };
    case "annee_derniere": return { code, debut: jour(a - 1, 0, 1), fin: jour(a - 1, 11, 31) };
  }
}

/** Période personnalisée : bornes remises dans l'ordre si besoin. */
export function periodePersonnalisee(debut: string, fin: string): Periode {
  return debut <= fin ? { code: "personnalisee", debut, fin } : { code: "personnalisee", debut: fin, fin: debut };
}

/** Tous les jours de la période (pour un graphique jour par jour). */
export function joursDePeriode(p: Pick<Periode, "debut" | "fin">): string[] {
  const [a, m, j] = p.debut.split("-").map(Number);
  const jours: string[] = [];
  for (let d = new Date(a, m - 1, j); iso(d) <= p.fin; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    jours.push(iso(d));
    if (jours.length > 400) break;
  }
  return jours;
}

/** Libellé court d'une période : « 1 – 30 nov. 2026 », « 12 nov. 2026 »… */
export function libellePeriode(p: Periode): string {
  if (p.code !== "personnalisee") return LIBELLES_PERIODES[p.code];
  const f = (s: string, avecAnnee: boolean) => {
    const [a, m, j] = s.split("-").map(Number);
    return new Date(a, m - 1, j).toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(avecAnnee ? { year: "numeric" } : {}) });
  };
  if (p.debut === p.fin) return f(p.debut, true);
  const memeAnnee = p.debut.slice(0, 4) === p.fin.slice(0, 4);
  return `${f(p.debut, !memeAnnee)} – ${f(p.fin, true)}`;
}

/**
 * Signature dessinée au doigt ou à la souris : traits (suites de points) convertis en image SVG
 * (fond transparent, recadrée sur le dessin), déposée comme les autres images puis imprimée en bas
 * des factures. Même rendu sur le web et sur mobile.
 */

export type Point = { x: number; y: number };
export type Trait = Point[];

const MARGE = 6;
const EPAISSEUR = 2.5;
const COULEUR = "#111827";

/** Le dessin contient-il au moins un trait visible ? */
export function signatureVide(traits: readonly Trait[]): boolean {
  return !traits.some((t) => t.length > 0);
}

/** Image SVG de la signature, recadrée sur le dessin (null si rien n'est dessiné). */
export function svgSignature(traits: readonly Trait[]): string | null {
  const points = traits.flat();
  if (!points.length) return null;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs) - MARGE, y0 = Math.min(...ys) - MARGE;
  const largeur = Math.max(...xs) - x0 + MARGE, hauteur = Math.max(...ys) - y0 + MARGE;
  const n = (v: number) => Math.round(v * 10) / 10;
  const chemins = traits.filter((t) => t.length).map((t) => {
    const [premier, ...suite] = t;
    // Un simple point (toucher sans glisser) est dessiné comme un petit trait
    const reste = suite.length ? suite : [{ x: premier.x + 0.1, y: premier.y }];
    return `M${n(premier.x - x0)} ${n(premier.y - y0)}` + reste.map((p) => `L${n(p.x - x0)} ${n(p.y - y0)}`).join("");
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(largeur)}" height="${n(hauteur)}" viewBox="0 0 ${n(largeur)} ${n(hauteur)}">`
    + `<path d="${chemins.join("")}" fill="none" stroke="${COULEUR}" stroke-width="${EPAISSEUR}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

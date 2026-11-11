/**
 * Aperçu d'un numéro de document — même règle que prive.formater_numero.
 * Le vrai numéro est attribué par la base à la validation (sans trou).
 */
export function formaterNumero(format: string, prefixe: string, annee: number, n: number): string {
  const v = format.replace("{PREFIX}", prefixe).replace("{YYYY}", String(annee));
  if (/\{N:(\d+)d\}/.test(v)) {
    return v.replace(/\{N:(\d+)d\}/, (_, longueur: string) => String(n).padStart(Number(longueur), "0"));
  }
  return v.replace("{N}", String(n));
}

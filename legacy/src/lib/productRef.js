// Génération de la référence article (SKU) à partir du nom.
// Syntaxe : 3 premiers caractères de chaque mot du nom, joints par "-",
// suivis d'un numéro incrémental sur 4 chiffres.
// Ex : "LCD iPhone 17 Pro Max" -> "LCD-IPH-17-PRO-MAX-0001"
export function generateProductRef(settings, name = "") {
  const s = settings || {};
  const num = s.product_ref_next_number ?? 1;
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const abbr = words.map((w) => w.substring(0, 3).toUpperCase()).join("-");
  const paddedNum = String(num).padStart(4, "0");
  return `${abbr}-${paddedNum}`;
}

// La référence utilise toujours un compteur incrémental.
export function productRefUsesCounter(settings) {
  return true;
}
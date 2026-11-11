export const TAX_TYPES = [
  { value: "none", label: "Aucun(e)" },
  { value: "total", label: "Sur le total" },
  { value: "deduction", label: "Déduction de taxe" },
  { value: "per_item", label: "Par article" },
];

export function taxTypeLabel(type) {
  return TAX_TYPES.find((t) => t.value === type)?.label || "Aucun(e)";
}

/**
 * Calcule la taxe à partir des paramètres de l'entreprise.
 * - subtotal : somme de tous les articles (affiché en sous-total)
 * - taxableSubtotal : somme des articles marqués « sujet à taxe » (base d'imposition)
 * Retourne null si aucune taxe n'est configurée.
 */
export function computeTax(settings, subtotal, taxableSubtotal) {
  const type = settings?.tax_type;
  const rate = Number(settings?.tax_rate) || 0;
  if (!type || type === "none" || !rate) return null;
  const base = taxableSubtotal != null ? taxableSubtotal : subtotal;
  const name = settings?.tax_name || "Taxe";
  const inclusive = !!settings?.tax_inclusive;
  const deduction = type === "deduction";
  let taxAmount;
  let total;
  if (inclusive && !deduction) {
    // La taxe est déjà incluse dans les prix des articles taxables.
    taxAmount = base - base / (1 + rate / 100);
    total = subtotal;
  } else {
    taxAmount = deduction ? -((base * rate) / 100) : (base * rate) / 100;
    total = subtotal + taxAmount;
  }
  return { name, rate, type, inclusive, deduction, taxAmount, total };
}
// Génération centralisée des numéros de documents (facture, devis, bon de livraison)
export function generateDocNumber(s, type) {
  const y = new Date().getFullYear();
  const prefix =
    type === "proforma" ? (s.proforma_prefix || "PRO-")
    : type === "bl" ? (s.bl_prefix || "BL-")
    : (s.invoice_prefix || "FAC-");
  const num =
    type === "proforma" ? (s.proforma_next_number || 1)
    : type === "bl" ? (s.bl_next_number || 1)
    : (s.invoice_next_number || 1);
  return (s.invoice_number_format || "{PREFIX}{YYYY}-{N:04d}")
    .replace("{PREFIX}", prefix)
    .replace("{YYYY}", String(y))
    .replace(/\{N:(\d+)d\}/, (_, len) => String(num).padStart(Number(len), "0"));
}

// Nom du champ "prochain numéro" dans Settings selon le type de document
export const nextNumberField = (type) =>
  type === "proforma" ? "proforma_next_number"
  : type === "bl" ? "bl_next_number"
  : "invoice_next_number";
/**
 * Formate un montant avec séparateur de milliers " " (espace) et 2 décimales,
 * et place le symbole de devise APRÈS le montant.
 * Ex: formatAmount(1234567, "CFA") => "1 234 567,00 CFA"
 */
export function formatAmount(value, symbol = "") {
  const num = Number(value) || 0;
  const isCfa = (symbol || "").toUpperCase() === "CFA";
  const fractionDigits = isCfa ? 0 : 2;
  const formatted = num.toLocaleString("fr-FR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return symbol ? `${formatted} ${symbol}` : formatted;
}
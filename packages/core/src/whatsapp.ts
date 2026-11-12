/**
 * Numéro au format international attendu par WhatsApp (wa.me) : chiffres seuls, indicatif compris.
 * Un numéro local (« 77 833 97 71 ») reçoit l'indicatif du téléphone de l'entreprise (« +221 … »).
 */
export function numeroWhatsApp(telephone: string, telephoneEntreprise?: string | null): string {
  const brut = telephone.trim();
  if (brut.startsWith("+")) return brut.replace(/\D/g, "");
  if (brut.startsWith("00")) return brut.replace(/\D/g, "").slice(2);
  const chiffres = brut.replace(/\D/g, "").replace(/^0(?=\d{8,})/, "");
  const indicatif = telephoneEntreprise?.trim().match(/^(?:\+|00)(\d{1,3})/)?.[1];
  // Numéro local court (10 chiffres au plus) : indicatif de l'entreprise s'il est connu
  return indicatif && chiffres.length <= 10 && !chiffres.startsWith(indicatif) ? `${indicatif}${chiffres}` : chiffres;
}

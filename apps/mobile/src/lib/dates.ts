/** Dates « AAAA-MM-JJ » ↔ Date locale (sans décalage de fuseau). */
export const versDate = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j);
};

export const versIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const dateCourte = (iso: string) =>
  versDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

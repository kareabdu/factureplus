/**
 * Transforme une erreur Supabase/Postgres en message lisible.
 * Les messages levés par nos fonctions SQL (raise exception) sont déjà en français : on les garde.
 */
export function traduireErreur(e: unknown): string {
  const err = e as { message?: string; code?: string } | null;
  const message = err?.message ?? String(e);
  if (err?.code === "23505" || /duplicate key/i.test(message)) {
    if (/code_barres/.test(message)) return "Ce code-barres est déjà utilisé par un autre produit.";
    if (/reference/.test(message)) return "Cette référence est déjà utilisée par un autre produit.";
    if (/categories/.test(message)) return "Cette catégorie existe déjà.";
    return "Cet élément existe déjà.";
  }
  if (err?.code === "23503" || /foreign key/i.test(message)) {
    return "Impossible : cet élément est utilisé ailleurs (historique de stock, documents…). Désactivez-le plutôt.";
  }
  if (err?.code === "23514" || /check constraint/i.test(message)) return "Valeur invalide.";
  if (err?.code === "42501" || /permission denied|row-level security/i.test(message)) {
    return "Action non autorisée.";
  }
  if (/Failed to fetch|Network request failed|NetworkError/i.test(message)) {
    return "Pas de connexion internet. Réessayez.";
  }
  if (/Invalid login credentials/i.test(message)) return "E-mail ou mot de passe incorrect.";
  if (/Email not confirmed/i.test(message)) return "Confirmez d'abord votre e-mail (lien reçu par e-mail).";
  if (/User already registered/i.test(message)) return "Un compte existe déjà avec cet e-mail.";
  if (/Password should be at least/i.test(message)) return "Le mot de passe doit contenir au moins 8 caractères.";
  return message;
}

/** Lève une erreur traduite si la réponse Supabase en contient une, sinon renvoie les données. */
export function verifier<T>(reponse: { data: T; error: unknown }): T {
  if (reponse.error) throw new Error(traduireErreur(reponse.error));
  return reponse.data;
}

/** Comme verifier, pour une ligne attendue (`.single()`) : erreur si absente. */
export function verifierUnique<T>(reponse: { data: T; error: unknown }): NonNullable<T> {
  const data = verifier(reponse);
  if (data == null) throw new Error("Élément introuvable");
  return data;
}

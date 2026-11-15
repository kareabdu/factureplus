// Inscription par e-mail et mot de passe : règles partagées web / mobile.

/** Message affiché quand on tente de s'inscrire avec l'e-mail d'un compte existant. */
export const MESSAGE_COMPTE_EXISTANT =
  "Un compte existe déjà avec cet e-mail. Connectez-vous, ou utilisez « Mot de passe oublié » si vous ne vous en souvenez plus.";

/**
 * Inscription avec l'e-mail d'un compte déjà confirmé : Supabase ne renvoie pas d'erreur (pour ne pas
 * révéler les comptes existants) mais un utilisateur sans aucune identité, et n'envoie aucun e-mail.
 * Un compte créé mais jamais confirmé garde son identité : le code est alors renvoyé normalement.
 */
export function inscriptionCompteExistant(data: { user: { identities?: unknown[] | null } | null }): boolean {
  return !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
}

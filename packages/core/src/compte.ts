import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier } from "./erreurs";

/** Compartiments de stockage rangés par équipe (« <equipe_id>/… »). */
const COMPARTIMENTS = ["produits", "recus", "documents"] as const;

/** Tous les fichiers d'un dossier, sous-dossiers compris (les dossiers n'ont pas d'id). */
async function listerFichiers(sb: SupabaseClient, compartiment: string, dossier: string): Promise<string[]> {
  const chemins: string[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await sb.storage.from(compartiment).list(dossier, { limit: 1000, offset: page * 1000 });
    if (error) throw error;
    for (const f of data ?? []) {
      const chemin = `${dossier}/${f.name}`;
      if (f.id) chemins.push(chemin);
      else chemins.push(...(await listerFichiers(sb, compartiment, chemin)));
    }
    if (!data || data.length < 1000) return chemins;
  }
}

/**
 * Supprime définitivement le compte connecté : fichiers de l'entreprise (images, reçus, PDF),
 * puis entreprise, données et compte (RPC supprimer_mon_compte). L'appelant doit ensuite fermer la session.
 */
export async function supprimerMonCompte(sb: SupabaseClient, equipeId: string | null): Promise<void> {
  if (equipeId) {
    for (const compartiment of COMPARTIMENTS) {
      const chemins = await listerFichiers(sb, compartiment, equipeId);
      for (let i = 0; i < chemins.length; i += 100) {
        verifier(await sb.storage.from(compartiment).remove(chemins.slice(i, i + 100)));
      }
    }
  }
  verifier(await sb.rpc("supprimer_mon_compte"));
}

/** Mot à saisir pour confirmer la suppression du compte. */
export const MOT_CONFIRMATION_SUPPRESSION = "SUPPRIMER";

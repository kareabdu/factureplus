import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier } from "./erreurs";
import type { Achat, EnteteAchat, LigneAchat } from "./types";

export async function listerAchats(sb: SupabaseClient, equipeId: string, fournisseurId?: string): Promise<Achat[]> {
  let q = sb.from("achats").select("*").eq("equipe_id", equipeId)
    .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
  if (fournisseurId) q = q.eq("fournisseur_id", fournisseurId);
  return verifier(await q) ?? [];
}

export async function chargerAchat(sb: SupabaseClient, id: string): Promise<{ achat: Achat; lignes: LigneAchat[] }> {
  const [achat, lignes] = await Promise.all([
    sb.from("achats").select("*").eq("id", id).single().then(verifier),
    sb.from("achat_lignes").select("*, produits(nom, unite)").eq("achat_id", id).order("position").then(verifier),
  ]);
  return { achat: achat as Achat, lignes: (lignes ?? []) as LigneAchat[] };
}

export async function enregistrerAchat(
  sb: SupabaseClient, equipeId: string, id: string | null, entete: EnteteAchat, lignes: LigneAchat[],
): Promise<string> {
  return verifier(await sb.rpc("enregistrer_achat", {
    p_equipe: equipeId, p_id: id, p_entete: entete,
    p_lignes: lignes.map(({ produit_id, quantite, cout_unitaire }) => ({ produit_id, quantite, cout_unitaire })),
  }));
}

/** Réception : entrées de stock et mise à jour du coût d'achat. Renvoie le numéro ACH-…. */
export async function receptionnerAchat(sb: SupabaseClient, id: string): Promise<string> {
  return verifier(await sb.rpc("receptionner_achat", { p_achat: id }));
}

export async function annulerAchat(sb: SupabaseClient, id: string) {
  verifier(await sb.rpc("annuler_achat", { p_achat: id }));
}

export async function supprimerAchatBrouillon(sb: SupabaseClient, id: string) {
  verifier(await sb.from("achats").delete().eq("id", id).eq("statut", "brouillon"));
}

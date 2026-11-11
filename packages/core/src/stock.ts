import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier } from "./erreurs";
import type { AlerteStock, Inventaire, LigneInventaire, MouvementStock, TypeMouvement } from "./types";

/**
 * Mouvement manuel. Pour un ajustement, `quantite` est la nouvelle quantité en stock.
 * Renvoie la nouvelle quantité. Refusé si le stock deviendrait négatif.
 */
export async function mouvementerStock(
  sb: SupabaseClient, produitId: string, type: TypeMouvement, quantite: number, motif?: string, reference?: string,
): Promise<number> {
  return verifier(await sb.rpc("mouvementer_stock", {
    p_produit: produitId, p_type: type, p_quantite: quantite, p_motif: motif ?? null, p_reference: reference ?? null,
  }));
}

export async function listerMouvements(
  sb: SupabaseClient, equipeId: string, options: { produitId?: string; limite?: number; type?: TypeMouvement } = {},
): Promise<MouvementStock[]> {
  let q = sb.from("mouvements_stock").select("*, produits(nom, unite)").eq("equipe_id", equipeId)
    .order("created_at", { ascending: false }).limit(options.limite ?? 100);
  if (options.produitId) q = q.eq("produit_id", options.produitId);
  if (options.type) q = q.eq("type", options.type);
  return verifier(await q) ?? [];
}

export async function listerAlertes(sb: SupabaseClient, equipeId: string): Promise<AlerteStock[]> {
  return verifier(await sb.from("alertes_stock").select("*, produits(nom, unite)")
    .eq("equipe_id", equipeId).eq("statut", "active").order("quantite")) ?? [];
}

// ---------------------------------------------------------------------------
// Inventaires
// ---------------------------------------------------------------------------

export async function listerInventaires(sb: SupabaseClient, equipeId: string): Promise<Inventaire[]> {
  return verifier(await sb.from("inventaires").select("*").eq("equipe_id", equipeId).order("created_at", { ascending: false })) ?? [];
}

export async function chargerInventaire(sb: SupabaseClient, id: string): Promise<{ inventaire: Inventaire; lignes: LigneInventaire[] }> {
  const [inventaire, lignes] = await Promise.all([
    sb.from("inventaires").select("*").eq("id", id).single().then(verifier),
    sb.from("inventaire_lignes").select("*, produits(nom, unite, code_barres, reference)").eq("inventaire_id", id)
      .then(verifier),
  ]);
  const triees = ((lignes ?? []) as LigneInventaire[]).sort((a, b) => (a.produits?.nom ?? "").localeCompare(b.produits?.nom ?? ""));
  return { inventaire: inventaire as Inventaire, lignes: triees };
}

export async function creerInventaire(sb: SupabaseClient, equipeId: string, notes?: string): Promise<string> {
  return verifier(await sb.rpc("creer_inventaire", { p_equipe: equipeId, p_notes: notes ?? null }));
}

export async function saisirComptage(sb: SupabaseClient, inventaireId: string, produitId: string, quantite: number | null) {
  verifier(await sb.from("inventaire_lignes").update({ quantite_comptee: quantite })
    .eq("inventaire_id", inventaireId).eq("produit_id", produitId));
}

/** Clôture : applique les écarts au stock. Renvoie le nombre d'écarts. */
export async function cloturerInventaire(sb: SupabaseClient, inventaireId: string): Promise<number> {
  return verifier(await sb.rpc("cloturer_inventaire", { p_inventaire: inventaireId }));
}

export async function supprimerInventaire(sb: SupabaseClient, inventaireId: string) {
  verifier(await sb.from("inventaires").delete().eq("id", inventaireId));
}

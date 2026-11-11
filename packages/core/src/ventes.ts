import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier } from "./erreurs";
import type {
  Document, EnteteDocument, LigneDocument, ModePaiement, Reglement, StatutDocument, TypeDocument,
} from "./types";

export interface FiltreDocuments {
  recherche?: string;
  statuts?: StatutDocument[];
  clientId?: string;
  limite?: number;
}

export async function listerDocuments(
  sb: SupabaseClient, equipeId: string, type: TypeDocument, filtre: FiltreDocuments = {},
): Promise<Document[]> {
  let q = sb.from("documents").select("*").eq("equipe_id", equipeId).eq("type", type)
    .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(filtre.limite ?? 200);
  if (filtre.statuts?.length) q = q.in("statut", filtre.statuts);
  if (filtre.clientId) q = q.eq("client_id", filtre.clientId);
  if (filtre.recherche?.trim()) {
    const m = `%${filtre.recherche.trim().replace(/[%_\\]/g, "\\$&").replace(/[,()]/g, " ")}%`;
    q = q.or(`numero.ilike.${m},client_nom.ilike.${m}`);
  }
  return verifier(await q) ?? [];
}

export async function chargerDocument(
  sb: SupabaseClient, id: string,
): Promise<{ document: Document; lignes: LigneDocument[]; reglements: Reglement[] }> {
  const [document, lignes, reglements] = await Promise.all([
    sb.from("documents").select("*").eq("id", id).single().then(verifier),
    sb.from("document_lignes").select("*").eq("document_id", id).order("position").then(verifier),
    sb.from("reglements").select("*").eq("document_id", id).order("date").then(verifier),
  ]);
  return { document: document as Document, lignes: (lignes ?? []) as LigneDocument[], reglements: (reglements ?? []) as Reglement[] };
}

/** Crée (id null) ou met à jour un brouillon. Renvoie son id. */
export async function enregistrerDocument(
  sb: SupabaseClient, equipeId: string, type: TypeDocument, id: string | null, entete: EnteteDocument, lignes: LigneDocument[],
): Promise<string> {
  const lignesPropres = lignes.map(({ produit_id, designation, description, unite, prix_unitaire, quantite, taxable }) => ({
    produit_id, designation, description, unite, prix_unitaire, quantite, taxable,
  }));
  return verifier(await sb.rpc("enregistrer_document", {
    p_equipe: equipeId, p_type: type, p_id: id, p_entete: entete, p_lignes: lignesPropres,
  }));
}

/** Valide : attribue le numéro et, pour une facture, déduit le stock. Renvoie le numéro. */
export async function validerDocument(sb: SupabaseClient, id: string): Promise<string> {
  return verifier(await sb.rpc("valider_document", { p_document: id }));
}

/** Annule un document validé ; une facture réinjecte son stock. */
export async function annulerDocument(sb: SupabaseClient, id: string) {
  verifier(await sb.rpc("annuler_document", { p_document: id }));
}

export async function supprimerBrouillon(sb: SupabaseClient, id: string) {
  verifier(await sb.from("documents").delete().eq("id", id).eq("statut", "brouillon"));
}

/** Proforma acceptée → nouvelle facture brouillon (renvoie son id). */
export async function convertirProforma(sb: SupabaseClient, id: string): Promise<string> {
  return verifier(await sb.rpc("convertir_proforma", { p_proforma: id }));
}

export async function refuserProforma(sb: SupabaseClient, id: string) {
  verifier(await sb.rpc("refuser_proforma", { p_proforma: id }));
}

/** Bon de livraison depuis une facture validée (renvoie son id). */
export async function creerBonLivraison(sb: SupabaseClient, factureId: string): Promise<string> {
  return verifier(await sb.rpc("creer_bl", { p_facture: factureId }));
}

export async function enregistrerReglement(
  sb: SupabaseClient, documentId: string, montant: number, mode: ModePaiement, date?: string, reference?: string,
): Promise<string> {
  return verifier(await sb.rpc("enregistrer_reglement", {
    p_document: documentId, p_montant: montant, p_mode: mode, p_date: date ?? null, p_reference: reference ?? null,
  }));
}

export async function supprimerReglement(sb: SupabaseClient, reglementId: string) {
  verifier(await sb.rpc("supprimer_reglement", { p_reglement: reglementId }));
}

/** Ligne vide ou issue d'un produit, pour l'éditeur. */
export function ligneDepuisProduit(p: { id: string; nom: string; unite: string; prix_vente: number }, quantite = 1): LigneDocument {
  return { produit_id: p.id, designation: p.nom, unite: p.unite, prix_unitaire: p.prix_vente, quantite, taxable: true };
}

import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier, verifierUnique } from "./erreurs";
import type { CategorieDepense, Depense, SaisieDepense } from "./regles-depenses";

// ---------------------------------------------------------------------------
// Dépenses de l'entreprise (table simple, écriture directe par les membres)
// ---------------------------------------------------------------------------

export interface FiltreDepenses {
  /** Bornes incluses AAAA-MM-JJ */
  debut?: string | null;
  fin?: string | null;
  categorie?: CategorieDepense | null;
  recherche?: string;
}

export async function listerDepenses(sb: SupabaseClient, equipeId: string, filtre: FiltreDepenses = {}): Promise<Depense[]> {
  let q = sb.from("depenses").select("*").eq("equipe_id", equipeId)
    .order("date_depense", { ascending: false }).order("created_at", { ascending: false });
  if (filtre.debut) q = q.gte("date_depense", filtre.debut);
  if (filtre.fin) q = q.lte("date_depense", filtre.fin);
  if (filtre.categorie) q = q.eq("categorie", filtre.categorie);
  const r = filtre.recherche?.trim().toLowerCase();
  const lignes: Depense[] = (verifier(await q.limit(1000)) ?? []).map((d: Depense) => ({ ...d, montant: Number(d.montant) }));
  return r ? lignes.filter((d) => d.commercant.toLowerCase().includes(r) || d.description?.toLowerCase().includes(r)) : lignes;
}

export async function chargerDepense(sb: SupabaseClient, id: string): Promise<Depense> {
  const d: Depense = verifierUnique(await sb.from("depenses").select("*").eq("id", id).single());
  return { ...d, montant: Number(d.montant) };
}

export async function creerDepense(sb: SupabaseClient, equipeId: string, saisie: SaisieDepense): Promise<string> {
  return verifierUnique(await sb.from("depenses").insert({ ...saisie, equipe_id: equipeId }).select("id").single()).id;
}

export async function modifierDepense(sb: SupabaseClient, id: string, saisie: Partial<SaisieDepense>) {
  verifier(await sb.from("depenses").update(saisie).eq("id", id));
}

export async function supprimerDepense(sb: SupabaseClient, depense: Pick<Depense, "id" | "recu_chemin">) {
  verifier(await sb.from("depenses").delete().eq("id", depense.id));
  if (depense.recu_chemin) await sb.storage.from("recus").remove([depense.recu_chemin]);
}

/** Envoie la photo d'un reçu (compartiment privé) et renvoie son chemin. */
export async function envoyerRecu(
  sb: SupabaseClient, equipeId: string, contenu: ArrayBuffer | Blob, typeMime = "image/jpeg",
): Promise<string> {
  const extension = typeMime === "application/pdf" ? "pdf" : (typeMime.split("/")[1] ?? "jpg");
  const chemin = `${equipeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  verifier(await sb.storage.from("recus").upload(chemin, contenu, { contentType: typeMime, upsert: false }));
  return chemin;
}

/** Lien temporaire (1 h) pour afficher un reçu. */
export async function lienRecu(sb: SupabaseClient, chemin: string): Promise<string> {
  const { data, error } = await sb.storage.from("recus").createSignedUrl(chemin, 3600);
  if (error || !data) throw new Error("Reçu introuvable");
  return data.signedUrl;
}

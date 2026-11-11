import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier, verifierUnique } from "./erreurs";
import type { Categorie, Client, Fournisseur, Produit, SaisieProduit } from "./types";

// ---------------------------------------------------------------------------
// Produits
// ---------------------------------------------------------------------------

export interface FiltreProduits {
  recherche?: string;
  categorieId?: string | null;
  inactifs?: boolean;
  stockBas?: boolean;
}

/** Échappe une saisie pour un filtre PostgREST `or(...)` (virgules, parenthèses, jokers). */
function motif(recherche: string): string {
  return `%${recherche.trim().replace(/[%_\\]/g, "\\$&").replace(/[,()]/g, " ")}%`;
}

export async function listerProduits(sb: SupabaseClient, equipeId: string, filtre: FiltreProduits = {}): Promise<Produit[]> {
  let q = sb.from("produits").select("*").eq("equipe_id", equipeId).order("nom");
  if (!filtre.inactifs) q = q.eq("actif", true);
  if (filtre.categorieId) q = q.eq("categorie_id", filtre.categorieId);
  if (filtre.recherche?.trim()) {
    const m = motif(filtre.recherche);
    q = q.or(`nom.ilike.${m},reference.ilike.${m},code_barres.ilike.${m}`);
  }
  const produits: Produit[] = verifier(await q) ?? [];
  return filtre.stockBas ? produits.filter(estStockBas) : produits;
}

export function estStockBas(p: Pick<Produit, "quantite" | "seuil_alerte">): boolean {
  return p.seuil_alerte > 0 && p.quantite <= p.seuil_alerte;
}

export async function chargerProduit(sb: SupabaseClient, id: string): Promise<Produit> {
  return verifierUnique(await sb.from("produits").select("*").eq("id", id).single());
}

/** Recherche exacte par code-barres (scan). */
export async function produitParCodeBarres(sb: SupabaseClient, equipeId: string, code: string): Promise<Produit | null> {
  return verifier(
    await sb.from("produits").select("*").eq("equipe_id", equipeId).eq("code_barres", code.trim()).maybeSingle(),
  );
}

export async function creerProduit(sb: SupabaseClient, equipeId: string, saisie: SaisieProduit, stockInitial = 0): Promise<string> {
  return verifier(await sb.rpc("creer_produit", { p_equipe: equipeId, p_produit: saisie, p_stock_initial: stockInitial }));
}

export async function modifierProduit(sb: SupabaseClient, id: string, saisie: Partial<SaisieProduit> & { actif?: boolean }) {
  verifier(await sb.from("produits").update(saisie).eq("id", id));
}

export async function supprimerProduit(sb: SupabaseClient, id: string) {
  verifier(await sb.from("produits").delete().eq("id", id));
}

/** Envoie une photo de produit dans le stockage « produits » et renvoie son URL publique. */
export async function envoyerImageProduit(
  sb: SupabaseClient, equipeId: string, contenu: ArrayBuffer | Blob, typeMime = "image/jpeg",
): Promise<string> {
  const extension = typeMime.split("/")[1] ?? "jpg";
  const chemin = `${equipeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  verifier(await sb.storage.from("produits").upload(chemin, contenu, { contentType: typeMime, upsert: false }));
  return sb.storage.from("produits").getPublicUrl(chemin).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Catégories, fournisseurs, clients : CRUD simple
// ---------------------------------------------------------------------------

type Table = "categories" | "fournisseurs" | "clients";
type Ligne<T extends Table> = T extends "categories" ? Categorie : T extends "fournisseurs" ? Fournisseur : Client;
type Saisie<T extends Table> = Omit<Partial<Ligne<T>>, "id" | "equipe_id"> & { nom: string };

async function lister<T extends Table>(sb: SupabaseClient, table: T, equipeId: string, recherche?: string): Promise<Ligne<T>[]> {
  let q = sb.from(table).select("*").eq("equipe_id", equipeId).order("nom");
  if (recherche?.trim()) {
    const m = motif(recherche);
    q = table === "categories" ? q.ilike("nom", m) : q.or(`nom.ilike.${m},telephone.ilike.${m}`);
  }
  return verifier(await q) ?? [];
}

async function creer<T extends Table>(sb: SupabaseClient, table: T, equipeId: string, saisie: Saisie<T>): Promise<Ligne<T>> {
  return verifierUnique(await sb.from(table).insert({ ...saisie, equipe_id: equipeId }).select("*").single());
}

async function modifier<T extends Table>(sb: SupabaseClient, table: T, id: string, saisie: Partial<Saisie<T>>) {
  verifier(await sb.from(table).update(saisie as Record<string, unknown>).eq("id", id));
}

async function supprimer(sb: SupabaseClient, table: Table, id: string) {
  verifier(await sb.from(table).delete().eq("id", id));
}

export const listerCategories = (sb: SupabaseClient, equipeId: string) => lister(sb, "categories", equipeId);
export const creerCategorie = (sb: SupabaseClient, equipeId: string, s: Saisie<"categories">) => creer(sb, "categories", equipeId, s);
export const modifierCategorie = (sb: SupabaseClient, id: string, s: Partial<Saisie<"categories">>) => modifier(sb, "categories", id, s);
export const supprimerCategorie = (sb: SupabaseClient, id: string) => supprimer(sb, "categories", id);

export const listerFournisseurs = (sb: SupabaseClient, equipeId: string, recherche?: string) =>
  lister(sb, "fournisseurs", equipeId, recherche);
export const creerFournisseur = (sb: SupabaseClient, equipeId: string, s: Saisie<"fournisseurs">) =>
  creer(sb, "fournisseurs", equipeId, s);
export const modifierFournisseur = (sb: SupabaseClient, id: string, s: Partial<Saisie<"fournisseurs">>) =>
  modifier(sb, "fournisseurs", id, s);
export const supprimerFournisseur = (sb: SupabaseClient, id: string) => supprimer(sb, "fournisseurs", id);

export const listerClients = (sb: SupabaseClient, equipeId: string, recherche?: string) => lister(sb, "clients", equipeId, recherche);
export const creerClient = (sb: SupabaseClient, equipeId: string, s: Saisie<"clients">) => creer(sb, "clients", equipeId, s);
export const modifierClient = (sb: SupabaseClient, id: string, s: Partial<Saisie<"clients">>) => modifier(sb, "clients", id, s);
export const supprimerClient = (sb: SupabaseClient, id: string) => supprimer(sb, "clients", id);

export async function chargerClient(sb: SupabaseClient, id: string): Promise<Client> {
  return verifierUnique(await sb.from("clients").select("*").eq("id", id).single());
}

export async function chargerFournisseur(sb: SupabaseClient, id: string): Promise<Fournisseur> {
  return verifierUnique(await sb.from("fournisseurs").select("*").eq("id", id).single());
}

import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier, verifierUnique } from "./erreurs";
import type { MonEquipe, Parametres, ParametresModifiables, Profil } from "./types";

export async function chargerMesEquipes(sb: SupabaseClient): Promise<MonEquipe[]> {
  return verifier(await sb.rpc("mes_equipes")) ?? [];
}

export async function creerEquipe(sb: SupabaseClient, nom: string, devise = "XOF", symbole = "FCFA"): Promise<string> {
  return verifier(await sb.rpc("creer_equipe", { p_nom: nom, p_devise: devise, p_symbole: symbole }));
}

export async function chargerProfil(sb: SupabaseClient, userId: string): Promise<Profil | null> {
  return verifier(await sb.from("profils").select("*").eq("id", userId).maybeSingle());
}

export async function modifierProfil(sb: SupabaseClient, userId: string, champs: Pick<Profil, "nom_complet" | "telephone">) {
  verifier(await sb.from("profils").update(champs).eq("id", userId));
}

export async function chargerParametres(sb: SupabaseClient, equipeId: string): Promise<Parametres> {
  return verifierUnique(await sb.from("parametres").select("*").eq("equipe_id", equipeId).single());
}

export async function modifierParametres(sb: SupabaseClient, equipeId: string, champs: ParametresModifiables) {
  verifier(await sb.from("parametres").update(champs).eq("equipe_id", equipeId));
}

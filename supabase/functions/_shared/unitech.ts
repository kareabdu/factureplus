// Outils communs aux fonctions Unitech Pay (Wave, Orange Money Max It).
// Secrets : UNITECH_API_KEY (clé marchand Unitech Pay), ORIGINES_WEB (origines du site
// autorisées pour le retour après paiement, séparées par des virgules).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const API_UNITECH = "https://api.unitech.sn/api";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
}

/** Client Supabase avec le rôle service (contourne la RLS : à n'utiliser qu'après contrôle). */
export function clientService(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Utilisateur connecté d'après le jeton de la requête, ou null. */
export async function utilisateurConnecte(sb: SupabaseClient, req: Request) {
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jeton) return null;
  const { data } = await sb.auth.getUser(jeton);
  return data.user ?? null;
}

export function cleUnitech(): string | null {
  return Deno.env.get("UNITECH_API_KEY") || null;
}

export async function appelUnitech(action: string, cle: string, corps?: unknown): Promise<any> {
  const reponse = await fetch(`${API_UNITECH}?action=${action}`, {
    method: corps === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const texte = await reponse.text();
  try {
    return JSON.parse(texte);
  } catch {
    return { success: false, message: `Réponse Unitech Pay illisible (HTTP ${reponse.status})` };
  }
}

/** Origines du site web autorisées comme retour après paiement (sinon retour vers l'app). */
export function origineAutorisee(origine: unknown): string | null {
  if (typeof origine !== "string") return null;
  const liste = (Deno.env.get("ORIGINES_WEB") ?? "http://localhost:3000")
    .split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
  const o = origine.trim().replace(/\/+$/, "");
  return liste.includes(o) ? o : null;
}

/** Statut de transaction Unitech Pay réussi (les libellés varient selon le moyen). */
export function estPaye(statut: unknown): boolean {
  const s = String(statut ?? "").toLowerCase();
  return ["paid", "success", "successful", "completed", "done"].includes(s) || /success|paid|completed|valid/.test(s);
}

export function estEchoue(statut: unknown): boolean {
  return /fail|cancel|expired|error|refus/.test(String(statut ?? "").toLowerCase());
}

/** Montant d'une transaction (noms de champs variables selon les réponses). */
export function montantTransaction(t: Record<string, unknown>): number {
  return Number(t.amount ?? t.Amount ?? t.montant ?? t.Montant ?? t.value ?? t.total ?? 0) || 0;
}

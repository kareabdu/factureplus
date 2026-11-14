import type { SupabaseClient } from "@supabase/supabase-js";

import { verifier } from "./erreurs";

/** Données jointes aux notifications push de stock (fonction Edge « push-stock »). */
export interface DonneesNotificationStock {
  type: "stock";
  produitId: string;
  url: string;
}

/** Enregistre (ou rattache au compte connecté) le jeton push Expo de cet appareil. */
export async function enregistrerAppareilPush(sb: SupabaseClient, jeton: string, plateforme: "ios" | "android") {
  verifier(await sb.rpc("enregistrer_appareil_push", { p_jeton: jeton, p_plateforme: plateforme }));
}

/** Retire le jeton de cet appareil (notifications désactivées ou déconnexion). */
export async function retirerAppareilPush(sb: SupabaseClient, jeton: string) {
  verifier(await sb.rpc("retirer_appareil_push", { p_jeton: jeton }));
}

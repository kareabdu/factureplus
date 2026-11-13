// Page de retour après paiement Unitech Pay : redirige vers le site web (origine autorisée)
// ou vers l'application mobile (factureplus://abonnement). Sans vérification de JWT.
import { origineAutorisee } from "../_shared/unitech.ts";

Deno.serve((req) => {
  const url = new URL(req.url);
  const etat = url.searchParams.get("etat") === "succes" ? "succes" : "annule";
  const site = origineAutorisee(url.searchParams.get("cible"));
  const destination = site ? `${site}/abonnement?paiement=${etat}` : `factureplus://abonnement?paiement=${etat}`;
  return new Response(null, { status: 302, headers: { Location: destination } });
});

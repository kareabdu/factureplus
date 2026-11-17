"use client";

import { useEffect } from "react";

/** Préférence « version ordinateur » choisie sur téléphone (sinon : application) */
export const CLE_VERSION_SITE = "factureplus.version";

/**
 * Adresse de l'application (version navigateur de l'app mobile, /app) correspondant à une page du site.
 * null : page à laisser telle quelle (pages publiques, liens de PDF, réinitialisation du mot de passe…).
 */
export function adresseApplication(chemin: string, recherche: URLSearchParams): string | null {
  const id = recherche.get("id");
  const avecId = (avec: string, sans: string) => (id ? `${avec}/${encodeURIComponent(id)}` : sans);
  const q = recherche.toString();
  const correspondances: Record<string, () => string> = {
    "/connexion": () => "/app/connexion",
    "/inscription": () => "/app/inscription",
    "/mot-de-passe-oublie": () => "/app/mot-de-passe-oublie",
    "/tableau-de-bord": () => "/app/",
    "/produits": () => "/app/produits",
    "/produits/fiche": () => avecId("/app/produit", "/app/produits"),
    "/produits/editer": () => (id ? `/app/produit/editer?id=${encodeURIComponent(id)}` : "/app/produit/editer"),
    "/ventes": () => "/app/ventes",
    "/ventes/document": () => avecId("/app/document", `/app/document/editer${recherche.get("type") ? `?type=${recherche.get("type")}` : ""}`),
    "/achats": () => "/app/achats",
    "/achats/document": () => avecId("/app/achat", "/app/achat/editer"),
    "/depenses": () => "/app/depenses",
    "/clients": () => "/app/clients",
    "/fournisseurs": () => "/app/fournisseurs",
    "/categories": () => "/app/categories",
    "/stock/mouvements": () => "/app/mouvements",
    "/stock/inventaires": () => "/app/inventaires",
    "/parametres": () => "/app/parametres",
    "/parametres/signature": () => "/app/signature",
    "/abonnement": () => `/app/abonnement${q ? `?${q}` : ""}`,
    "/admin": () => "/app/admin",
    "/plus": () => "/app/plus",
  };
  // Mon compte : la réinitialisation du mot de passe reste sur le site (lien reçu par e-mail)
  if (chemin === "/compte") return recherche.get("reinitialisation") ? null : "/app/compte";
  const cible = correspondances[chemin.replace(/\/+$/, "") || "/"];
  return cible ? cible() : null;
}

/**
 * Sur téléphone, le site ouvre l'application (même présentation que l'app mobile), sauf si l'utilisateur
 * a choisi la version ordinateur. Ordinateur et tablette : site inchangé.
 */
export function RedirectionMobile() {
  useEffect(() => {
    try {
      if (localStorage.getItem(CLE_VERSION_SITE) === "ordinateur") return;
    } catch { /* stockage indisponible */ }
    const telephone = window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
    // Jetons de session dans l'adresse (lien reçu par e-mail) : le site les traite d'abord
    if (!telephone || window.location.hash.includes("access_token")) return;
    const cible = adresseApplication(window.location.pathname, new URLSearchParams(window.location.search));
    if (cible) window.location.replace(cible);
  }, []);
  return null;
}

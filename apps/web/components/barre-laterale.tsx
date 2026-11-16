"use client";

import { lirePreferenceTheme, memoriserPreferenceTheme, type PreferenceTheme } from "@factureplus/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icone, type NomIcone } from "@/components/icones";
import { Logo } from "@/components/ui";
import { useEquipe, useSession } from "@/lib/espace";

export const SECTIONS: { titre?: string; liens: { href: string; libelle: string; icone: NomIcone }[] }[] = [
  { liens: [
    { href: "/tableau-de-bord", libelle: "Tableau de bord", icone: "accueil" },
    { href: "/produits", libelle: "Produits", icone: "produits" },
    { href: "/ventes", libelle: "Ventes", icone: "ventes" },
    { href: "/achats", libelle: "Achats", icone: "achats" },
    { href: "/depenses", libelle: "Dépenses", icone: "depenses" },
  ] },
  { titre: "Stock", liens: [
    { href: "/stock/mouvements", libelle: "Mouvements", icone: "mouvements" },
    { href: "/stock/inventaires", libelle: "Inventaires", icone: "inventaire" },
    { href: "/categories", libelle: "Catégories", icone: "categories" },
  ] },
  { titre: "Tiers", liens: [
    { href: "/clients", libelle: "Clients", icone: "clients" },
    { href: "/fournisseurs", libelle: "Fournisseurs", icone: "fournisseurs" },
  ] },
  { titre: "Réglages", liens: [
    { href: "/parametres", libelle: "Entreprise", icone: "reglages" },
    { href: "/abonnement", libelle: "Abonnement", icone: "abonnement" },
    { href: "/compte", libelle: "Mon compte", icone: "compte" },
  ] },
];

export const SECTION_ADMIN = { titre: "Plateforme", liens: [{ href: "/admin", libelle: "Administration", icone: "admin" as NomIcone }] };

export const THEMES: { valeur: PreferenceTheme; icone: NomIcone; libelle: string }[] = [
  { valeur: "auto", icone: "ecran", libelle: "Automatique" },
  { valeur: "clair", icone: "soleil", libelle: "Clair" },
  { valeur: "sombre", icone: "lune", libelle: "Sombre" },
];

/** Apparence choisie (clair, sombre, automatique), mémorisée et appliquée à la page. */
export function useThemeWeb() {
  const [theme, setTheme] = useState<PreferenceTheme>(lirePreferenceTheme);
  function changerTheme(p: PreferenceTheme) {
    memoriserPreferenceTheme(p);
    setTheme(p);
    if (p === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", p);
  }
  return { theme, changerTheme };
}

/**
 * Ordinateur et tablette : barre latérale sombre. Téléphone : en-tête clair comme l'application mobile
 * (la navigation passe par la barre d'onglets du bas, OngletsMobile).
 */
export function BarreLaterale() {
  const pathname = usePathname();
  const { deconnecter, email } = useSession();
  const { parametres, estAdmin } = useEquipe();
  const { theme, changerTheme } = useThemeWeb();

  const actif = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Téléphone : en-tête clair, comme l'application mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
        <Logo />
        <span className="truncate text-xs text-muted">{parametres?.nom_entreprise}</span>
      </div>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-panneau text-panneau-texte md:flex">
        <div className="hidden px-5 pb-4 pt-6 md:block"><Logo inverse /></div>
        <p className="truncate px-5 pb-3 text-xs text-panneau-discret md:pt-0 pt-4">{parametres?.nom_entreprise}</p>
        <nav className="flex flex-1 flex-col gap-5 px-3">
          {(estAdmin ? [...SECTIONS, SECTION_ADMIN] : SECTIONS).map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {s.titre && <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-panneau-discret">{s.titre}</p>}
              {s.liens.map((l) => (
                <Link key={l.href} href={l.href} aria-current={actif(l.href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                    actif(l.href) ? "bg-white/10 font-medium text-white" : "text-panneau-discret hover:bg-white/5 hover:text-panneau-texte"}`}>
                  <Icone nom={l.icone} taille={18} />
                  {l.libelle}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="flex flex-col gap-3 border-t border-panneau-bordure p-4">
          <div role="radiogroup" aria-label="Apparence" className="flex gap-1 rounded-xl bg-white/5 p-1">
            {THEMES.map((t) => (
              <button key={t.valeur} type="button" role="radio" aria-checked={theme === t.valeur} aria-label={t.libelle} title={t.libelle}
                onClick={() => changerTheme(t.valeur)}
                className={`flex flex-1 justify-center rounded-lg py-1.5 ${theme === t.valeur ? "bg-white/10 text-white" : "text-panneau-discret hover:text-panneau-texte"}`}>
                <Icone nom={t.icone} taille={16} />
              </button>
            ))}
          </div>
          <p className="truncate text-xs text-panneau-discret">{email}</p>
          <button type="button" onClick={() => void deconnecter()}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-panneau-discret hover:bg-white/5 hover:text-panneau-texte">
            <Icone nom="deconnexion" taille={18} /> Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}

const ONGLETS: { href: string; libelle: string; icone: NomIcone }[] = [
  { href: "/tableau-de-bord", libelle: "Accueil", icone: "accueil" },
  { href: "/produits", libelle: "Produits", icone: "produits" },
  { href: "/ventes", libelle: "Ventes", icone: "ventes" },
  { href: "/plus", libelle: "Plus", icone: "points" },
];

/** Téléphone : barre d'onglets en bas, comme l'application mobile (Accueil, Produits, Ventes, Plus). */
export function OngletsMobile() {
  const pathname = usePathname();
  const principal = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // « Plus » regroupe tout le reste (achats, stock, clients, réglages…)
  const actif = (href: string) => href === "/plus" ? !ONGLETS.slice(0, 3).some((o) => principal(o.href)) : principal(href);
  return (
    <nav aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {ONGLETS.map((o) => {
          const courant = actif(o.href);
          return (
            <Link key={o.href} href={o.href} aria-current={courant ? "page" : undefined}
              className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium ${courant ? "text-primary" : "text-muted"}`}>
              <span className={`flex h-7 w-14 items-center justify-center rounded-full ${courant ? "bg-primary-soft" : ""}`}>
                <Icone nom={o.icone} taille={20} />
              </span>
              {o.libelle}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { lirePreferenceTheme, memoriserPreferenceTheme, type PreferenceTheme } from "@factureplus/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icone, type NomIcone } from "@/components/icones";
import { Logo } from "@/components/ui";
import { useEquipe, useSession } from "@/lib/espace";

const SECTIONS: { titre?: string; liens: { href: string; libelle: string; icone: NomIcone }[] }[] = [
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

const SECTION_ADMIN = { titre: "Plateforme", liens: [{ href: "/admin", libelle: "Administration", icone: "admin" as NomIcone }] };

const THEMES: { valeur: PreferenceTheme; icone: NomIcone; libelle: string }[] = [
  { valeur: "auto", icone: "ecran", libelle: "Automatique" },
  { valeur: "clair", icone: "soleil", libelle: "Clair" },
  { valeur: "sombre", icone: "lune", libelle: "Sombre" },
];

export function BarreLaterale() {
  const pathname = usePathname();
  const { deconnecter, email } = useSession();
  const { parametres, estAdmin } = useEquipe();
  const [ouvert, setOuvert] = useState(false);
  const [theme, setTheme] = useState<PreferenceTheme>(lirePreferenceTheme);

  function changerTheme(p: PreferenceTheme) {
    memoriserPreferenceTheme(p);
    setTheme(p);
    if (p === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", p);
  }

  const actif = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Bandeau mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-panneau-bordure bg-panneau px-4 py-3 md:hidden">
        <Logo inverse />
        <button type="button" onClick={() => setOuvert((o) => !o)} aria-label="Menu" aria-expanded={ouvert} className="rounded-lg p-2 text-panneau-texte">
          <Icone nom={ouvert ? "fermer" : "menu"} />
        </button>
      </div>

      <aside className={`${ouvert ? "flex" : "hidden"} fixed inset-0 top-[57px] z-20 flex-col overflow-y-auto bg-panneau text-panneau-texte md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0`}>
        <div className="hidden px-5 pb-4 pt-6 md:block"><Logo inverse /></div>
        <p className="truncate px-5 pb-3 text-xs text-panneau-discret md:pt-0 pt-4">{parametres?.nom_entreprise}</p>
        <nav className="flex flex-1 flex-col gap-5 px-3">
          {(estAdmin ? [...SECTIONS, SECTION_ADMIN] : SECTIONS).map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {s.titre && <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-panneau-discret">{s.titre}</p>}
              {s.liens.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOuvert(false)} aria-current={actif(l.href) ? "page" : undefined}
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

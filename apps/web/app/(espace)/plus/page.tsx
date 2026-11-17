"use client";

import { LIBELLES_ETATS_ACCES } from "@factureplus/core";
import Link from "next/link";

import { SECTION_ADMIN, SECTIONS, THEMES, useThemeWeb } from "@/components/barre-laterale";
import { CLE_VERSION_SITE } from "@/components/redirection-mobile";
import { Icone, type NomIcone } from "@/components/icones";
import { useEquipe, useSession } from "@/lib/espace";

/** Liens déjà présents dans la barre d'onglets du téléphone */
const ONGLETS = ["/tableau-de-bord", "/produits", "/ventes"];

/**
 * « Plus » : tout ce qui n'est pas dans la barre d'onglets du téléphone, en listes groupées comme
 * l'onglet Plus de l'application mobile (achats, stock, tiers, réglages, apparence, déconnexion).
 */
export default function PagePlus() {
  const { deconnecter, email } = useSession();
  const { parametres, abonnement, estAdmin } = useEquipe();
  const { theme, changerTheme } = useThemeWeb();
  const sections = (estAdmin ? [...SECTIONS, SECTION_ADMIN] : SECTIONS)
    .map((s) => ({ ...s, titre: s.titre ?? "Achats et dépenses", liens: s.liens.filter((l) => !ONGLETS.includes(l.href)) }))
    .filter((s) => s.liens.length);

  const detail = (href: string) => href === "/parametres" ? parametres?.nom_entreprise
    : href === "/abonnement" && abonnement ? `${LIBELLES_ETATS_ACCES[abonnement.etat]}${abonnement.fin ? ` · jusqu'au ${abonnement.fin.toLocaleDateString("fr-FR")}` : ""}`
    : href === "/compte" ? email : undefined;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Plus</h1>
      {sections.map((s) => (
        <section key={s.titre}>
          <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted">{s.titre}</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {s.liens.map((l, i) => (
              <Ligne key={l.href} href={l.href} icone={l.icone} libelle={l.libelle} detail={detail(l.href)} separateur={i > 0} />
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted">Apparence</h2>
        <div role="radiogroup" aria-label="Apparence" className="flex gap-2">
          {THEMES.map((t) => (
            <button key={t.valeur} type="button" role="radio" aria-checked={theme === t.valeur} onClick={() => changerTheme(t.valeur)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm ${
                theme === t.valeur ? "border-primary bg-primary text-on-primary" : "border-border bg-surface"}`}>
              <Icone nom={t.icone} taille={16} /> {t.libelle}
            </button>
          ))}
        </div>
      </section>

      {/* Téléphone : retour à l'application (même présentation que l'app mobile) */}
      <button type="button" className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left md:hidden"
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- /app n'est pas une page Next (fichiers statiques)
        onClick={() => { try { localStorage.removeItem(CLE_VERSION_SITE); } catch { /* indisponible */ } window.location.href = "/app/"; }}>
        <Icone nom="produits" taille={20} /> Version application (téléphone)
      </button>

      <button type="button" onClick={() => void deconnecter()}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left text-danger">
        <Icone nom="deconnexion" taille={20} /> Se déconnecter
      </button>
    </div>
  );
}

function Ligne({ href, icone, libelle, detail, separateur }: { href: string; icone: NomIcone; libelle: string; detail?: string | null; separateur: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3.5 active:bg-surface-retrait ${separateur ? "border-t border-border" : ""}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Icone nom={icone} taille={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{libelle}</span>
        {detail && <span className="block truncate text-xs text-muted">{detail}</span>}
      </span>
      <Icone nom="fleche" taille={16} className="text-muted" />
    </Link>
  );
}

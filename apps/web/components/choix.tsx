"use client";

import {
  formaterMontant, formaterQuantite, listerArticlesLibres, listerClients, listerFournisseurs, listerProduits, type ArticleLibre, type Produit,
} from "@factureplus/core";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { Icone } from "@/components/icones";
import { Recherche } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

/**
 * Recherche d'un produit (nom, référence, code-barres — compatible douchette USB) avec liste déroulante.
 * Avec `onChoisirArticle`, propose aussi les articles déjà saisis librement dans les documents (hors catalogue).
 * La flèche affiche / masque un échantillon des produits sans rien saisir (comme sur mobile) ; la liste reste
 * ouverte après un choix pour ajouter plusieurs articles à la suite.
 */
export function ChoixProduit({ onChoisir, onChoisirArticle, placeholder = "Ajouter un produit : nom, référence ou code-barres…" }: {
  onChoisir: (p: Produit) => void; onChoisirArticle?: (a: ArticleLibre) => void; placeholder?: string;
}) {
  const { equipeId, parametres } = useEquipe();
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  // Clic en dehors du champ et de la liste : la liste ouverte par la flèche se referme
  // (pointerdown plutôt que blur : Safari ne donne pas le focus aux boutons cliqués)
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: PointerEvent) => { if (!zone.current?.contains(e.target as Node)) setOuvert(false); };
    document.addEventListener("pointerdown", fermer);
    return () => document.removeEventListener("pointerdown", fermer);
  }, [ouvert]);
  const r = useDeferredValue(recherche);
  const avecArticles = !!onChoisirArticle;
  const visible = ouvert || !!recherche.trim();
  const { donnees } = useDonnees(
    () => (visible
      ? Promise.all([listerProduits(supabase, equipeId, { recherche: r.trim() || undefined }),
        avecArticles ? listerArticlesLibres(supabase, equipeId, r.trim(), r.trim() ? 8 : 20) : []])
      : Promise.resolve([[], []] as [Produit[], ArticleLibre[]])),
    [equipeId, r, avecArticles, visible],
  );
  const resultats = (donnees?.[0] ?? []).slice(0, r.trim() ? 8 : 30);
  const articles = donnees?.[1] ?? [];
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);

  function choisir(p: Produit) {
    onChoisir(p);
    setRecherche("");
  }

  function reprendre(a: ArticleLibre) {
    onChoisirArticle?.(a);
    setRecherche("");
  }

  return (
    <div ref={zone} className="relative">
      <div className="relative" onKeyDown={(e) => {
        if (e.key === "Escape") { setOuvert(false); setRecherche(""); }
        // Douchette : le code exact suivi d'Entrée ajoute directement le produit
        if (e.key === "Enter") {
          e.preventDefault();
          const exact = resultats.find((p) => p.code_barres === recherche.trim()) ?? (resultats.length === 1 && !articles.length ? resultats[0] : null);
          if (exact) choisir(exact);
          else if (!resultats.length && articles.length === 1) reprendre(articles[0]);
        }
      }}>
        <Recherche valeur={recherche} onChange={setRecherche} placeholder={placeholder} className="[&_input]:pr-11" />
        <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={visible}
          aria-label={visible ? "Masquer les produits" : "Afficher les produits"} title={visible ? "Masquer les produits" : "Afficher les produits"}
          className="absolute inset-y-0 right-1.5 my-auto grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-retrait hover:text-foreground">
          <Icone nom="bas" taille={18} className={`transition-transform ${visible ? "rotate-180" : ""}`} />
        </button>
      </div>
      {visible && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-carte" role="listbox">
          {resultats.length === 0 && articles.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">{avecArticles ? "Aucun produit ni article trouvé." : "Aucun produit trouvé."}</li>
          )}
          {resultats.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => choisir(p)} className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm hover:bg-surface-retrait">
                <span>
                  <span className="font-medium">{p.nom}</span>
                  <span className="block text-xs text-muted">{[p.reference, `Stock : ${formaterQuantite(p.quantite)} ${p.unite}`].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="montant whitespace-nowrap">{m(p.prix_vente)}</span>
              </button>
            </li>
          ))}
          {articles.length > 0 && (
            <li className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted" role="presentation">Articles déjà saisis</li>
          )}
          {articles.map((a) => (
            <li key={a.designation}>
              <button type="button" onClick={() => reprendre(a)} className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm hover:bg-surface-retrait">
                <span>
                  <span className="font-medium">{a.designation}</span>
                  <span className="block text-xs text-muted">Hors catalogue · {a.utilisations} fois{a.unite ? ` · ${a.unite}` : ""}</span>
                </span>
                <span className="montant whitespace-nowrap">{m(a.prix_unitaire)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Liste déroulante des clients ou fournisseurs. */
export function ChoixTiers({ type, valeur, onChange, libelle }: {
  type: "clients" | "fournisseurs"; valeur: string | null; onChange: (t: { id: string; nom: string; telephone: string | null; adresse: string | null } | null) => void; libelle: string;
}) {
  const { equipeId } = useEquipe();
  const { donnees } = useDonnees(() => (type === "clients" ? listerClients(supabase, equipeId) : listerFournisseurs(supabase, equipeId)), [equipeId, type]);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{libelle}</span>
      <select value={valeur ?? ""} onChange={(e) => onChange((donnees ?? []).find((t) => t.id === e.target.value) ?? null)}
        className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15">
        <option value="">— Saisie libre —</option>
        {(donnees ?? []).map((t) => <option key={t.id} value={t.id}>{t.nom}{t.telephone ? ` · ${t.telephone}` : ""}</option>)}
      </select>
    </label>
  );
}

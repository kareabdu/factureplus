"use client";

import { formaterMontant, formaterQuantite, listerClients, listerFournisseurs, listerProduits, type Produit } from "@factureplus/core";
import { useDeferredValue, useState } from "react";

import { Recherche } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

/** Recherche d'un produit (nom, référence, code-barres — compatible douchette USB) avec liste déroulante. */
export function ChoixProduit({ onChoisir, placeholder = "Ajouter un produit : nom, référence ou code-barres…" }: {
  onChoisir: (p: Produit) => void; placeholder?: string;
}) {
  const { equipeId, parametres } = useEquipe();
  const [recherche, setRecherche] = useState("");
  const r = useDeferredValue(recherche);
  const { donnees } = useDonnees(() => (r.trim() ? listerProduits(supabase, equipeId, { recherche: r }) : Promise.resolve([])), [equipeId, r]);
  const resultats = (donnees ?? []).slice(0, 8);

  function choisir(p: Produit) {
    onChoisir(p);
    setRecherche("");
  }

  return (
    <div className="relative">
      <div onKeyDown={(e) => {
        // Douchette : le code exact suivi d'Entrée ajoute directement le produit
        if (e.key === "Enter") {
          e.preventDefault();
          const exact = resultats.find((p) => p.code_barres === recherche.trim()) ?? (resultats.length === 1 ? resultats[0] : null);
          if (exact) choisir(exact);
        }
      }}>
        <Recherche valeur={recherche} onChange={setRecherche} placeholder={placeholder} />
      </div>
      {recherche.trim() && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-carte" role="listbox">
          {resultats.length === 0 && <li className="px-4 py-3 text-sm text-muted">Aucun produit trouvé.</li>}
          {resultats.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => choisir(p)} className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm hover:bg-surface-retrait">
                <span>
                  <span className="font-medium">{p.nom}</span>
                  <span className="block text-xs text-muted">{[p.reference, `Stock : ${formaterQuantite(p.quantite)} ${p.unite}`].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="montant whitespace-nowrap">{formaterMontant(p.prix_vente, parametres?.symbole_devise)}</span>
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

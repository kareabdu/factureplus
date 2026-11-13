"use client";

import { creerCategorie, listerCategories, modifierCategorie, supprimerCategorie } from "@factureplus/core";
import { useState, type FormEvent } from "react";

import { Icone } from "@/components/icones";
import { Alerte, Bouton, Carte, EnTetePage, Vide } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function Categories() {
  const { equipeId } = useEquipe();
  const { donnees, recharger } = useDonnees(() => listerCategories(supabase, equipeId), [equipeId]);
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function executer(fn: () => Promise<unknown>) {
    setErreur(null);
    try { await fn(); await recharger(); } catch (e) { setErreur((e as Error).message); }
  }

  function ajouter(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    void executer(async () => { await creerCategorie(supabase, equipeId, { nom: nom.trim() }); setNom(""); });
  }

  return (
    <>
      <EnTetePage titre="Catégories" description="Classez vos produits pour les retrouver plus vite." />
      <form onSubmit={ajouter} className="mb-4 flex max-w-md gap-2">
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nouvelle catégorie (ex. Boissons)" aria-label="Nouvelle catégorie"
          className="h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
        <Bouton type="submit" icone="plus" disabled={!nom.trim()}>Ajouter</Bouton>
      </form>
      {erreur && <div className="mb-4"><Alerte>{erreur}</Alerte></div>}
      <Carte sansMarge className="max-w-md">
        {donnees?.length === 0 ? <Vide icone="categories" titre="Aucune catégorie" /> : (
          <ul className="divide-y divide-border">
            {donnees?.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="font-medium">{c.nom}</span>
                <span className="flex gap-1">
                  <button type="button" className="rounded-lg px-2 py-1 text-muted hover:bg-surface-retrait hover:text-foreground" onClick={() => {
                    const v = window.prompt("Nouveau nom", c.nom);
                    if (v?.trim()) void executer(() => modifierCategorie(supabase, c.id, { nom: v.trim() }));
                  }}>Renommer</button>
                  <button type="button" aria-label={`Supprimer ${c.nom}`} className="rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger" onClick={() => {
                    if (window.confirm(`Supprimer « ${c.nom} » ? Les produits resteront, sans catégorie.`)) void executer(() => supprimerCategorie(supabase, c.id));
                  }}><Icone nom="supprimer" taille={16} /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </>
  );
}

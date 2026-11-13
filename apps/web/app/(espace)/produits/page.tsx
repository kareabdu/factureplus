"use client";

import { estStockBas, formaterMontant, formaterQuantite, listerCategories, listerProduits } from "@factureplus/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useState } from "react";

import { Alerte, Badge, Carte, Chargement, EnTetePage, LienBouton, Liste, Recherche, Segments, Tableau, Vide } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function PageProduits() {
  return <Suspense fallback={<Chargement />}><Produits /></Suspense>;
}

function Produits() {
  const { equipeId, parametres } = useEquipe();
  const router = useRouter();
  const params = useSearchParams();
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "bas" | "inactifs">(params.get("filtre") === "bas" ? "bas" : "tous");
  const [categorie, setCategorie] = useState("");
  const r = useDeferredValue(recherche);
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);

  const { donnees, chargement, erreur } = useDonnees(
    () => listerProduits(supabase, equipeId, { recherche: r, stockBas: filtre === "bas", inactifs: filtre === "inactifs", categorieId: categorie || null }),
    [equipeId, r, filtre, categorie],
  );
  const categories = useDonnees(() => listerCategories(supabase, equipeId), [equipeId]);
  const produits = filtre === "inactifs" ? (donnees ?? []).filter((p) => !p.actif) : donnees ?? [];
  const valeur = produits.reduce((s, p) => s + p.quantite * p.prix_achat, 0);

  return (
    <>
      <EnTetePage titre="Produits" description={donnees ? `${produits.length} produit(s) · valeur du stock ${m(Math.round(valeur))}` : undefined}
        action={<LienBouton href="/produits/editer" icone="plus">Nouveau produit</LienBouton>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom, référence, code-barres…" className="min-w-64 flex-1" />
        <Segments options={[{ valeur: "tous", libelle: "Actifs" }, { valeur: "bas", libelle: "Stock bas" }, { valeur: "inactifs", libelle: "Désactivés" }]}
          valeur={filtre} onChange={setFiltre} libelle="Filtre" />
        {(categories.donnees?.length ?? 0) > 0 && (
          <Liste value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-auto" aria-label="Catégorie">
            <option value="">Toutes catégories</option>
            {categories.donnees?.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Liste>
        )}
      </div>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte sansMarge>
        <Tableau
          entetes={[{ libelle: "Produit" }, { libelle: "Référence" }, { libelle: "Prix de vente", droite: true }, { libelle: "Prix d'achat", droite: true }, { libelle: "Stock", droite: true }]}
          vide={!chargement && produits.length === 0 ? <Vide icone="produits" titre="Aucun produit" texte={recherche ? undefined : "Ajoutez votre premier produit."} /> : undefined}>
          {produits.map((p) => (
            <tr key={p.id} onClick={() => router.push(`/produits/fiche?id=${p.id}`)} className="cursor-pointer hover:bg-surface-retrait">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {p.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.image_url} alt="" className="size-9 rounded-lg object-cover" />
                    : <span className="size-9 rounded-lg bg-primary-soft" />}
                  <span className="font-medium">{p.nom}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted">{p.reference}</td>
              <td className="montant px-4 py-3 text-right">{m(p.prix_vente)}</td>
              <td className="montant px-4 py-3 text-right text-muted">{m(p.prix_achat)}</td>
              <td className="px-4 py-3 text-right">
                <span className="montant font-medium">{formaterQuantite(p.quantite)}</span> <span className="text-muted">{p.unite}</span>
                {p.quantite === 0 ? <div><Badge ton="danger">Rupture</Badge></div> : estStockBas(p) && <div><Badge ton="attention">Stock bas</Badge></div>}
              </td>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}

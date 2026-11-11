"use client";

import {
  chargerProduit, creerProduit, envoyerImageProduit, lireQuantite, listerCategories, modifierProduit, type Produit, type SaisieProduit,
} from "@stocktracker/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Alerte, Bouton, Carte, Champ, ChampMontant, Chargement, EnTetePage, Liste, Zone } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function PageEditer() {
  return <Suspense fallback={<Chargement />}><Chargeur /></Suspense>;
}

function Chargeur() {
  const id = useSearchParams().get("id");
  const { donnees } = useDonnees(() => (id ? chargerProduit(supabase, id) : Promise.resolve(null)), [id]);
  if (id && !donnees) return <Chargement />;
  return <Formulaire produit={donnees} />;
}

function Formulaire({ produit: p }: { produit: Produit | null }) {
  const router = useRouter();
  const { equipeId, parametres } = useEquipe();
  const symbole = parametres?.symbole_devise;
  const categories = useDonnees(() => listerCategories(supabase, equipeId), [equipeId]);
  const [prixVente, setPrixVente] = useState<number | null>(p?.prix_vente ?? null);
  const [prixAchat, setPrixAchat] = useState<number | null>(p?.prix_achat ?? null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texte = (k: string) => String(f.get(k) ?? "").trim() || null;
    setErreur(null);
    setChargement(true);
    try {
      let image_url = p?.image_url ?? null;
      if (fichier) image_url = await envoyerImageProduit(supabase, equipeId, fichier, fichier.type || "image/jpeg");
      const saisie: SaisieProduit = {
        nom: String(f.get("nom")).trim(), reference: texte("reference"), code_barres: texte("code_barres"), categorie_id: texte("categorie_id"),
        description: texte("description"), unite: texte("unite") ?? "Pcs", prix_vente: prixVente ?? 0, prix_achat: prixAchat ?? 0,
        seuil_alerte: lireQuantite(String(f.get("seuil_alerte") || "0")) ?? 0, image_url,
      };
      if (p) {
        await modifierProduit(supabase, p.id, saisie);
        router.push(`/produits/fiche?id=${p.id}`);
      } else {
        const id = await creerProduit(supabase, equipeId, saisie, lireQuantite(String(f.get("stock_initial") || "0")) ?? 0);
        router.push(`/produits/fiche?id=${id}`);
      }
    } catch (err) {
      setErreur((err as Error).message);
      setChargement(false);
    }
  }

  return (
    <>
      <EnTetePage titre={p ? `Modifier « ${p.nom} »` : "Nouveau produit"} retour={p ? `/produits/fiche?id=${p.id}` : "/produits"} />
      <form onSubmit={envoyer} className="flex max-w-3xl flex-col gap-6">
        {erreur && <Alerte>{erreur}</Alerte>}
        <Carte titre="Identification">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ libelle="Nom" name="nom" defaultValue={p?.nom} required className="sm:col-span-2" />
            <Champ libelle="Référence" name="reference" defaultValue={p?.reference ?? ""}
              aide={!p && parametres?.ref_produit_auto ? "Laissez vide pour une référence automatique" : undefined} />
            <Champ libelle="Code-barres" name="code_barres" defaultValue={p?.code_barres ?? ""} aide="Saisie ou douchette" />
            <Liste libelle="Catégorie" name="categorie_id" defaultValue={p?.categorie_id ?? ""}>
              <option value="">Aucune</option>
              {categories.donnees?.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Liste>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Photo</span>
              <input type="file" accept="image/*" onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary" />
            </label>
            <Zone libelle="Description" name="description" defaultValue={p?.description ?? ""} className="sm:col-span-2" />
          </div>
        </Carte>
        <Carte titre="Prix et stock">
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampMontant libelle="Prix de vente" symbole={symbole} valeur={prixVente} onChange={setPrixVente} />
            <ChampMontant libelle="Prix d'achat" symbole={symbole} valeur={prixAchat} onChange={setPrixAchat} />
            <Champ libelle="Unité" name="unite" defaultValue={p?.unite ?? parametres?.unite_defaut ?? "Pcs"} />
            <Champ libelle="Seuil d'alerte" name="seuil_alerte" inputMode="decimal" defaultValue={p ? String(p.seuil_alerte).replace(".", ",") : ""}
              aide="Alerte quand le stock descend à ce niveau" />
            {!p && <Champ libelle="Stock initial" name="stock_initial" inputMode="decimal" aide="Quantité déjà en stock aujourd'hui" />}
          </div>
        </Carte>
        <div><Bouton type="submit" chargement={chargement}>Enregistrer</Bouton></div>
      </form>
    </>
  );
}

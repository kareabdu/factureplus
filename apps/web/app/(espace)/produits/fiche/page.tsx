"use client";

import {
  chargerProduit, estStockBas, formaterMontant, formaterQuantite, LIBELLES_MOUVEMENT, lireQuantite, listerMouvements,
  modifierProduit, mouvementerStock, supprimerProduit, type TypeMouvement,
} from "@stocktracker/core";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Alerte, Badge, Bouton, Carte, Champ, Chargement, EnTetePage, Info, LienBouton, Modale, Segments, Tableau } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function PageFiche() {
  return <Suspense fallback={<Chargement />}><Fiche /></Suspense>;
}

function Fiche() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { equipeId, parametres } = useEquipe();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const [mouvement, setMouvement] = useState<TypeMouvement | null>(null);
  const [erreurAction, setErreurAction] = useState<string | null>(null);
  const { donnees, erreur, recharger } = useDonnees(
    () => Promise.all([chargerProduit(supabase, id), listerMouvements(supabase, equipeId, { produitId: id, limite: 50 })]),
    [id, equipeId],
  );

  if (erreur && !donnees) return <Alerte>{erreur}</Alerte>;
  if (!donnees) return <Chargement />;
  const [p, mouvements] = donnees;

  async function supprimer() {
    if (!window.confirm(`Supprimer « ${p.nom} » ?`)) return;
    try {
      await supprimerProduit(supabase, p.id);
      router.replace("/produits");
    } catch {
      if (window.confirm("Ce produit a un historique de stock ou de ventes. Le désactiver à la place ?")) {
        await modifierProduit(supabase, p.id, { actif: false }).catch((e: Error) => setErreurAction(e.message));
        await recharger();
      }
    }
  }

  return (
    <>
      <EnTetePage titre={p.nom} retour="/produits"
        description={<span className="flex flex-wrap items-center gap-2">{[p.reference, p.code_barres].filter(Boolean).join(" · ")} {!p.actif && <Badge>Désactivé</Badge>}</span>}
        action={<>
          <LienBouton href={`/produits/editer?id=${p.id}`} variante="secondaire">Modifier</LienBouton>
          {!p.actif && <Bouton variante="secondaire" onClick={async () => { await modifierProduit(supabase, p.id, { actif: true }); await recharger(); }}>Réactiver</Bouton>}
          <Bouton variante="danger" icone="supprimer" onClick={supprimer}>Supprimer</Bouton>
        </>} />
      {erreurAction && <div className="mb-4"><Alerte>{erreurAction}</Alerte></div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-6">
          <Carte>
            <p className="text-sm text-muted">En stock</p>
            <p className={`chiffre montant mt-1 text-4xl font-semibold ${p.quantite === 0 ? "text-danger" : estStockBas(p) ? "text-warning" : ""}`}>
              {formaterQuantite(p.quantite)} <span className="text-base font-normal text-muted">{p.unite}</span>
            </p>
            {p.seuil_alerte > 0 && <p className="mt-1 text-sm text-muted">Alerte à {formaterQuantite(p.seuil_alerte)} {p.unite}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Bouton icone="plus" onClick={() => setMouvement("entree")}>Entrée</Bouton>
              <Bouton variante="secondaire" icone="moins" onClick={() => setMouvement("sortie")}>Sortie</Bouton>
              <Bouton variante="secondaire" onClick={() => setMouvement("ajustement")}>Ajuster</Bouton>
            </div>
          </Carte>
          <Carte>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.image_url && <img src={p.image_url} alt="" className="mb-4 aspect-square w-40 rounded-xl object-cover" />}
            <Info libelle="Prix de vente" valeur={m(p.prix_vente)} fort />
            <Info libelle="Prix d'achat" valeur={m(p.prix_achat)} />
            <Info libelle="Marge unitaire" valeur={m(p.prix_vente - p.prix_achat)} />
            <Info libelle="Valeur du stock (achat)" valeur={m(Math.round(p.quantite * p.prix_achat))} />
            {p.description && <p className="mt-3 whitespace-pre-line text-sm text-muted">{p.description}</p>}
          </Carte>
        </div>

        <Carte titre="Mouvements de stock" sansMarge>
          <Tableau entetes={[{ libelle: "Date" }, { libelle: "Type" }, { libelle: "Référence" }, { libelle: "Variation", droite: true }, { libelle: "Après", droite: true }]}
            vide={mouvements.length === 0 ? <p className="p-5 text-sm text-muted">Aucun mouvement.</p> : undefined}>
            {mouvements.map((mv) => (
              <tr key={mv.id}>
                <td className="px-4 py-2.5 text-muted">{new Date(mv.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-4 py-2.5">{LIBELLES_MOUVEMENT[mv.type]}{mv.motif && <span className="text-muted"> · {mv.motif}</span>}</td>
                <td className="px-4 py-2.5">
                  {mv.document_id ? <Link className="text-primary hover:underline" href={`/ventes/document?id=${mv.document_id}`}>{mv.reference}</Link>
                    : mv.achat_id ? <Link className="text-primary hover:underline" href={`/achats/document?id=${mv.achat_id}`}>{mv.reference}</Link>
                    : mv.reference}
                </td>
                <td className={`montant px-4 py-2.5 text-right font-medium ${mv.variation < 0 ? "text-danger" : "text-primary"}`}>
                  {mv.variation > 0 ? "+" : ""}{formaterQuantite(mv.variation)}
                </td>
                <td className="montant px-4 py-2.5 text-right">{formaterQuantite(mv.quantite_apres)}</td>
              </tr>
            ))}
          </Tableau>
        </Carte>
      </div>

      <Modale ouverte={!!mouvement} titre="Mouvement de stock" onFermer={() => setMouvement(null)}>
        {mouvement && <FormMouvement produit={p} typeInitial={mouvement} onFait={async () => { setMouvement(null); await recharger(); }} />}
      </Modale>
    </>
  );
}

function FormMouvement({ produit: p, typeInitial, onFait }: {
  produit: { id: string; quantite: number; unite: string }; typeInitial: TypeMouvement; onFait: () => Promise<void>;
}) {
  const [type, setType] = useState(typeInitial);
  const [quantite, setQuantite] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const q = lireQuantite(quantite);
  const apres = q == null ? null : type === "entree" ? p.quantite + q : type === "sortie" ? p.quantite - q : q;

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (q == null || (type !== "ajustement" && q <= 0)) return setErreur("Quantité invalide.");
    setChargement(true);
    try {
      await mouvementerStock(supabase, p.id, type, q, String(f.get("motif") || "") || undefined, String(f.get("reference") || "") || undefined);
      await onFait();
    } catch (err) {
      setErreur((err as Error).message);
      setChargement(false);
    }
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4">
      <Segments options={[{ valeur: "entree", libelle: "Entrée" }, { valeur: "sortie", libelle: "Sortie" }, { valeur: "ajustement", libelle: "Ajustement" }]}
        valeur={type} onChange={setType} />
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle={type === "ajustement" ? `Quantité réelle en stock (${p.unite})` : `Quantité (${p.unite})`} value={quantite}
        onChange={(e) => setQuantite(e.target.value)} inputMode="decimal" autoFocus required />
      <p className="text-sm text-muted">Stock : {formaterQuantite(p.quantite)} → <strong className={apres != null && apres < 0 ? "text-danger" : ""}>{apres == null ? "—" : formaterQuantite(apres)}</strong></p>
      <Champ libelle="Motif" name="motif" placeholder="Casse, réapprovisionnement, comptage…" />
      <Champ libelle="Référence" name="reference" />
      <Bouton type="submit" chargement={chargement}>Enregistrer</Bouton>
    </form>
  );
}

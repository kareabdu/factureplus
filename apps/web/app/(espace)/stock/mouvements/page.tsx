"use client";

import { formaterQuantite, LIBELLES_MOUVEMENT, listerMouvements, type TypeMouvement } from "@factureplus/core";
import Link from "next/link";
import { useState } from "react";

import { Alerte, Carte, EnTetePage, Segments, Tableau, Vide } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function Mouvements() {
  const { equipeId } = useEquipe();
  const [type, setType] = useState<TypeMouvement | "tous">("tous");
  const { donnees, chargement, erreur } = useDonnees(
    () => listerMouvements(supabase, equipeId, { limite: 300, type: type === "tous" ? undefined : type }), [equipeId, type]);

  return (
    <>
      <EnTetePage titre="Mouvements de stock" description="Historique inaltérable de toutes les entrées, sorties et corrections." />
      <div className="mb-4">
        <Segments options={[{ valeur: "tous", libelle: "Tous" }, { valeur: "entree", libelle: "Entrées" }, { valeur: "sortie", libelle: "Sorties" }, { valeur: "ajustement", libelle: "Ajustements" }]}
          valeur={type} onChange={setType} libelle="Type" />
      </div>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte sansMarge>
        <Tableau entetes={[{ libelle: "Date" }, { libelle: "Produit" }, { libelle: "Type" }, { libelle: "Référence" }, { libelle: "Variation", droite: true }, { libelle: "Stock après", droite: true }]}
          vide={!chargement && donnees?.length === 0 ? <Vide icone="mouvements" titre="Aucun mouvement" /> : undefined}>
          {(donnees ?? []).map((mv) => (
            <tr key={mv.id}>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted">{new Date(mv.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
              <td className="px-4 py-2.5"><Link href={`/produits/fiche?id=${mv.produit_id}`} className="font-medium hover:underline">{mv.produits?.nom}</Link></td>
              <td className="px-4 py-2.5">{LIBELLES_MOUVEMENT[mv.type]}{mv.motif && <span className="text-muted"> · {mv.motif}</span>}</td>
              <td className="px-4 py-2.5">
                {mv.document_id ? <Link href={`/ventes/document?id=${mv.document_id}`} className="text-primary hover:underline">{mv.reference}</Link>
                  : mv.achat_id ? <Link href={`/achats/document?id=${mv.achat_id}`} className="text-primary hover:underline">{mv.reference}</Link>
                  : mv.inventaire_id ? <Link href={`/stock/inventaire?id=${mv.inventaire_id}`} className="text-primary hover:underline">{mv.reference}</Link>
                  : mv.reference}
              </td>
              <td className={`montant px-4 py-2.5 text-right font-medium ${mv.variation < 0 ? "text-danger" : "text-primary"}`}>{mv.variation > 0 ? "+" : ""}{formaterQuantite(mv.variation)}</td>
              <td className="montant px-4 py-2.5 text-right">{formaterQuantite(mv.quantite_apres)} {mv.produits?.unite}</td>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}

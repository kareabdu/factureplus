"use client";

import { formaterMontant, listerDocuments, resteAPayer, statutAffiche, type StatutDocument, type TypeDocument } from "@factureplus/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useState } from "react";

import { Alerte, Badge, Carte, Chargement, EnTetePage, LienBouton, Recherche, Segments, Tableau, Vide } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

type Vue = "tout" | "impayes" | "brouillons";

export default function PageVentes() {
  return <Suspense fallback={<Chargement />}><Ventes /></Suspense>;
}

function Ventes() {
  const { equipeId, parametres } = useEquipe();
  const router = useRouter();
  const params = useSearchParams();
  const [type, setType] = useState<TypeDocument>((params.get("type") as TypeDocument) || "facture");
  const [vue, setVue] = useState<Vue>(params.get("vue") === "impayes" ? "impayes" : "tout");
  const [recherche, setRecherche] = useState("");
  const r = useDeferredValue(recherche);
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);

  const statuts: StatutDocument[] | undefined = vue === "impayes" ? ["emis"] : vue === "brouillons" ? ["brouillon"] : undefined;
  const { donnees, chargement, erreur } = useDonnees(() => listerDocuments(supabase, equipeId, type, { recherche: r, statuts }), [equipeId, type, vue, r]);
  const reste = (donnees ?? []).filter((d) => d.type === "facture" && d.statut === "emis").reduce((s, d) => s + resteAPayer(d), 0);

  return (
    <>
      <EnTetePage titre="Ventes" description={reste > 0 ? `Reste à encaisser : ${m(reste)}` : undefined}
        action={<>
          <LienBouton href="/ventes/document?type=facture" icone="plus">Facture</LienBouton>
          <LienBouton href="/ventes/document?type=proforma" variante="secondaire" icone="plus">Proforma</LienBouton>
        </>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segments options={[{ valeur: "facture", libelle: "Factures" }, { valeur: "proforma", libelle: "Proformas" }, { valeur: "bl", libelle: "Bons de livraison" }]}
          valeur={type} onChange={(t) => { setType(t); setVue("tout"); }} libelle="Type de document" />
        <Segments options={type === "facture"
          ? [{ valeur: "tout", libelle: "Toutes" }, { valeur: "impayes", libelle: "À encaisser" }, { valeur: "brouillons", libelle: "Brouillons" }]
          : [{ valeur: "tout", libelle: "Tous" }, { valeur: "brouillons", libelle: "Brouillons" }]} valeur={vue} onChange={setVue} libelle="Filtre" />
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="Numéro ou client…" className="min-w-56 flex-1" />
      </div>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte sansMarge>
        <Tableau entetes={[{ libelle: "Numéro" }, { libelle: "Date" }, { libelle: "Client" }, { libelle: "Statut" }, ...(type === "bl" ? [] : [{ libelle: "Total", droite: true }, { libelle: "Reste", droite: true }])]}
          vide={!chargement && donnees?.length === 0 ? <Vide icone="ventes" titre="Aucun document" texte={type === "bl" ? "Les bons de livraison se créent depuis une facture validée." : undefined} /> : undefined}>
          {(donnees ?? []).map((d) => {
            const s = statutAffiche(d);
            return (
              <tr key={d.id} onClick={() => router.push(`/ventes/document?id=${d.id}`)} className="cursor-pointer hover:bg-surface-retrait">
                <td className="px-4 py-3 font-medium">{d.numero ?? <span className="text-muted">Brouillon</span>}</td>
                <td className="px-4 py-3 text-muted">{new Date(`${d.date}T00:00:00`).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3">{d.client_nom}</td>
                <td className="px-4 py-3"><Badge ton={s.ton}>{s.libelle}</Badge></td>
                {type !== "bl" && <>
                  <td className="montant px-4 py-3 text-right">{m(d.total)}</td>
                  <td className="montant px-4 py-3 text-right text-muted">{d.type === "facture" && d.statut === "emis" ? m(resteAPayer(d)) : ""}</td>
                </>}
              </tr>
            );
          })}
        </Tableau>
      </Carte>
    </>
  );
}

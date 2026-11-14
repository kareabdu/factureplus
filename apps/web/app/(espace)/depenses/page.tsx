"use client";

import {
  CATEGORIES_DEPENSE, creerDepense, csvDepenses, envoyerRecu, formaterMontant, LIBELLES_CATEGORIES_DEPENSE, LIBELLES_MOYENS_DEPENSE,
  libellePeriode, lienRecu, listerDepenses, modifierDepense, MOYENS_DEPENSE, periodeParDefaut,
  resumerDepenses, supprimerDepense, type CategorieDepense, type Depense, type MoyenDepense,
  type Periode, type SaisieDepense,
} from "@factureplus/core";
import { useDeferredValue, useState, type FormEvent } from "react";

import { FiltresPeriode } from "@/components/filtres-periode";
import {
  Alerte, Bouton, Carte, Champ, ChampMontant, EnTetePage, Indicateur, Liste, Modale, Recherche, Tableau, Vide, Zone,
} from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export default function Depenses() {
  const { equipeId, parametres } = useEquipe();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const [periode, setPeriode] = useState<Periode>(() => periodeParDefaut());
  const [categorie, setCategorie] = useState<CategorieDepense | "">("");
  const [recherche, setRecherche] = useState("");
  const r = useDeferredValue(recherche);
  const [edition, setEdition] = useState<Depense | "nouvelle" | null>(null);
  const { donnees, chargement, erreur, recharger } = useDonnees(
    () => listerDepenses(supabase, equipeId, { debut: periode.debut, fin: periode.fin, categorie: categorie || null, recherche: r }),
    [equipeId, periode.debut, periode.fin, categorie, r],
  );
  const resume = resumerDepenses(donnees ?? []);

  function exporter() {
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob([`﻿${csvDepenses(donnees ?? [])}`], { type: "text/csv;charset=utf-8" }));
    lien.download = `depenses-${periode.debut}-${periode.fin}.csv`;
    lien.click();
    URL.revokeObjectURL(lien.href);
  }

  async function voirRecu(chemin: string) {
    try {
      window.open(await lienRecu(supabase, chemin), "_blank", "noopener");
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  return (
    <>
      <EnTetePage titre="Dépenses" description="Loyer, salaires, transport, factures… suivez vos charges."
        action={<>
          <Bouton variante="secondaire" icone="telecharger" onClick={exporter} disabled={!donnees?.length}>Exporter (CSV)</Bouton>
          <Bouton icone="plus" onClick={() => setEdition("nouvelle")}>Nouvelle dépense</Bouton>
        </>} />

      <FiltresPeriode periode={periode} onChange={setPeriode} className="mb-3" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Liste libelle="Catégorie" value={categorie} onChange={(e) => setCategorie(e.target.value as CategorieDepense | "")}>
          <option value="">Toutes</option>
          {CATEGORIES_DEPENSE.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
        </Liste>
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="Bénéficiaire, description…" className="min-w-56 flex-1" />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Indicateur libelle={`Total · ${libellePeriode(periode)}`} valeur={m(resume.total)} detail={`${resume.nombre} dépense(s)`} />
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-carte sm:p-5 md:col-span-2">
          <p className="mb-3 text-sm text-muted">Par catégorie</p>
          {resume.parCategorie.length === 0 && <p className="text-sm text-muted">Aucune dépense sur cette période.</p>}
          <div className="flex flex-col gap-2.5">
            {resume.parCategorie.map((c) => (
              <div key={c.categorie} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 truncate">{c.libelle}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-retrait">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, Math.round(c.part * 100))}%` }} />
                </span>
                <span className="montant w-32 shrink-0 text-right font-medium">{m(c.montant)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte sansMarge>
        <Tableau entetes={[{ libelle: "Date" }, { libelle: "Bénéficiaire" }, { libelle: "Catégorie" }, { libelle: "Payé par" }, { libelle: "Reçu" }, { libelle: "Montant", droite: true }]}
          vide={!chargement && donnees?.length === 0 ? (
            <Vide icone="depenses" titre="Aucune dépense" texte="Enregistrez vos dépenses pour suivre vos charges et votre rentabilité."
              action={<Bouton icone="plus" onClick={() => setEdition("nouvelle")}>Nouvelle dépense</Bouton>} />
          ) : undefined}>
          {(donnees ?? []).map((d) => (
            <tr key={d.id} onClick={() => setEdition(d)} className="cursor-pointer hover:bg-surface-retrait">
              <td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(`${d.date_depense}T00:00:00`).toLocaleDateString("fr-FR")}</td>
              <td className="px-4 py-3">
                <span className="font-medium">{d.commercant}</span>
                {d.description && <span className="block max-w-xs truncate text-xs text-muted">{d.description}</span>}
              </td>
              <td className="px-4 py-3 text-muted">{LIBELLES_CATEGORIES_DEPENSE[d.categorie]}</td>
              <td className="px-4 py-3 text-muted">{d.moyen_paiement ? LIBELLES_MOYENS_DEPENSE[d.moyen_paiement] : ""}</td>
              <td className="px-4 py-3">
                {d.recu_chemin && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); void voirRecu(d.recu_chemin!); }}
                    className="text-sm font-medium text-primary hover:underline">Voir</button>
                )}
              </td>
              <td className="montant px-4 py-3 text-right font-medium">{m(d.montant)}</td>
            </tr>
          ))}
        </Tableau>
      </Carte>

      <Modale ouverte={!!edition} titre={edition && edition !== "nouvelle" ? "Modifier la dépense" : "Nouvelle dépense"} onFermer={() => setEdition(null)}>
        {edition && (
          <FormulaireDepense key={edition === "nouvelle" ? "nouvelle" : edition.id} depense={edition === "nouvelle" ? null : edition}
            symbole={parametres?.symbole_devise} equipeId={equipeId}
            onFin={async () => { setEdition(null); await recharger(); }} />
        )}
      </Modale>
    </>
  );
}

function FormulaireDepense({ depense: d, equipeId, symbole, onFin }: {
  depense: Depense | null; equipeId: string; symbole?: string; onFin: () => Promise<void>;
}) {
  const [montant, setMontant] = useState<number | null>(d?.montant ?? null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [retirerRecu, setRetirerRecu] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function enregistrer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!montant || montant <= 0) return setErreur("Indiquez un montant.");
    setErreur(null);
    setChargement(true);
    try {
      let recu_chemin = retirerRecu ? null : d?.recu_chemin ?? null;
      if (fichier) recu_chemin = await envoyerRecu(supabase, equipeId, fichier, fichier.type || "image/jpeg");
      const saisie: SaisieDepense = {
        commercant: String(f.get("commercant")).trim(),
        montant,
        date_depense: String(f.get("date_depense")) || aujourdhui(),
        categorie: String(f.get("categorie")) as CategorieDepense,
        moyen_paiement: (String(f.get("moyen_paiement")) || null) as MoyenDepense | null,
        description: String(f.get("description") ?? "").trim() || null,
        recu_chemin,
      };
      if (d) await modifierDepense(supabase, d.id, saisie);
      else await creerDepense(supabase, equipeId, saisie);
      if (d?.recu_chemin && d.recu_chemin !== recu_chemin) await supabase.storage.from("recus").remove([d.recu_chemin]);
      await onFin();
    } catch (err) {
      setErreur((err as Error).message);
      setChargement(false);
    }
  }

  async function effacer() {
    if (!d || !window.confirm(`Supprimer la dépense « ${d.commercant} » ?`)) return;
    try {
      await supprimerDepense(supabase, d);
      await onFin();
    } catch (err) {
      setErreur((err as Error).message);
    }
  }

  return (
    <form onSubmit={enregistrer} className="flex flex-col gap-4">
      {erreur && <Alerte>{erreur}</Alerte>}
      <ChampMontant libelle="Montant" symbole={symbole} valeur={montant} onChange={setMontant} requis />
      <Champ libelle="Bénéficiaire" name="commercant" defaultValue={d?.commercant} required autoFocus
        placeholder="Ex. Senelec, propriétaire, transporteur" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ libelle="Date" name="date_depense" type="date" defaultValue={d?.date_depense ?? aujourdhui()} required />
        <Liste libelle="Catégorie" name="categorie" defaultValue={d?.categorie ?? "autre"}>
          {CATEGORIES_DEPENSE.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
        </Liste>
      </div>
      <Liste libelle="Payé par" name="moyen_paiement" defaultValue={d?.moyen_paiement ?? "especes"}>
        {MOYENS_DEPENSE.map((x) => <option key={x.code} value={x.code}>{x.libelle}</option>)}
      </Liste>
      <Zone libelle="Description" name="description" defaultValue={d?.description ?? ""} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Reçu (photo ou PDF)</span>
        {d?.recu_chemin && !retirerRecu && !fichier ? (
          <span className="flex items-center gap-3 text-muted">
            Reçu joint.
            <button type="button" onClick={() => setRetirerRecu(true)} className="font-medium text-danger hover:underline">Retirer</button>
          </span>
        ) : (
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-retrait file:px-3 file:py-2 file:text-sm file:font-medium" />
        )}
      </label>
      <div className="flex flex-wrap justify-between gap-2">
        {d ? <Bouton variante="danger" icone="supprimer" onClick={effacer}>Supprimer</Bouton> : <span />}
        <Bouton type="submit" chargement={chargement}>Enregistrer</Bouton>
      </div>
    </form>
  );
}

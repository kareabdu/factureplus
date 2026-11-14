"use client";

import {
  barresDePeriode, chargerResume, formaterMontant, formaterQuantite, libellePeriode, listerAlertes, periodeParDefaut, type Periode,
} from "@factureplus/core";
import Link from "next/link";
import { useState } from "react";

import { FiltresPeriode } from "@/components/filtres-periode";
import { Alerte, Bouton, Carte, Chargement, EnTetePage, Indicateur, LienBouton, Vide } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function TableauDeBord() {
  const { equipeId, parametres } = useEquipe();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const [maintenant] = useState(() => Date.now());
  const [periode, setPeriode] = useState<Periode>(() => periodeParDefaut());
  const { donnees, erreur, recharger } = useDonnees(
    () => Promise.all([chargerResume(supabase, equipeId, periode.debut, periode.fin), listerAlertes(supabase, equipeId)]),
    [equipeId, periode.debut, periode.fin],
  );

  if (erreur && !donnees) return <div className="flex flex-col gap-3"><Alerte>{erreur}</Alerte><Bouton variante="secondaire" onClick={() => void recharger()}>Réessayer</Bouton></div>;
  if (!donnees) return <Chargement />;
  const [r, alertes] = donnees;
  const lp = libellePeriode(periode);
  // Graphique : une barre par jour jusqu'à 62 jours, sinon une barre par mois
  const { parMois, barres } = barresDePeriode(periode, r.ventes_jours_periode);
  const max = Math.max(1, ...barres.map((b) => b.total));
  const libelleBarre = (cle: string) => parMois
    ? new Date(`${cle}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : new Date(`${cle}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  return (
    <>
      <EnTetePage titre="Tableau de bord" description={new Date(maintenant).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        action={<>
          <LienBouton href="/ventes/document?type=facture" icone="plus">Nouvelle facture</LienBouton>
          <LienBouton href="/produits/editer" variante="secondaire" icone="plus">Produit</LienBouton>
        </>} />

      <FiltresPeriode periode={periode} onChange={setPeriode} className="mb-5" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicateur libelle={`Ventes · ${lp}`} valeur={m(r.ventes_periode)} detail={`${r.nb_factures_periode} facture(s) · encaissé ${m(r.encaisse_periode)}`} href="/ventes" />
        <Indicateur libelle={`Marge · ${lp}`} valeur={m(r.marge_periode)} ton={r.marge_periode < 0 ? "danger" : "succes"} />
        <Indicateur libelle="Impayés" valeur={m(r.impayes)} ton={r.impayes > 0 ? "attention" : undefined} href="/ventes?vue=impayes" />
        <Indicateur libelle="Valeur du stock" valeur={m(r.valeur_stock_achat)} detail={`${r.nb_produits} produits · prix de vente ${m(r.valeur_stock_vente)}`} href="/produits" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Carte titre={`Ventes ${parMois ? "par mois" : "par jour"} · ${lp}`}>
          <div className="flex h-44 items-end gap-1" role="img" aria-label={`Histogramme des ventes ${parMois ? "mensuelles" : "quotidiennes"}`}>
            {barres.map((b) => (
              <div key={b.cle} className="group relative flex h-full flex-1 items-end">
                <div className={`w-full rounded-t ${b.total ? "bg-primary" : "bg-border"}`} style={{ height: `${Math.max(2, (b.total / max) * 100)}%` }} />
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                  {libelleBarre(b.cle)} · {m(b.total)}
                </span>
              </div>
            ))}
          </div>
          {barres.length === 1 && <p className="mt-2 text-center text-sm text-muted">{libelleBarre(barres[0].cle)} · {m(barres[0].total)}</p>}
        </Carte>

        <Carte titre="Stock bas" action={<Link href="/produits?filtre=bas" className="text-sm text-primary hover:underline">Tout voir</Link>} sansMarge>
          {alertes.length === 0 ? <Vide icone="produits" titre="Aucune alerte" texte="Tous les produits sont au-dessus de leur seuil." /> : (
            <ul className="divide-y divide-border">
              {alertes.slice(0, 7).map((a) => (
                <li key={a.id}>
                  <Link href={`/produits/fiche?id=${a.produit_id}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-surface-retrait">
                    <span className="font-medium">{a.produits?.nom}</span>
                    <span className={`montant ${a.quantite === 0 ? "text-danger" : "text-warning"}`}>{formaterQuantite(a.quantite)} / {formaterQuantite(a.seuil)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>

      {r.meilleurs_produits.length > 0 && (
        <Carte titre={`Meilleures ventes · ${lp}`} className="mt-6" sansMarge>
          <ul className="divide-y divide-border">
            {r.meilleurs_produits.map((p) => (
              <li key={p.produit_id}>
                <Link href={`/produits/fiche?id=${p.produit_id}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-surface-retrait">
                  <span><span className="font-medium">{p.nom}</span> <span className="text-muted">· {formaterQuantite(p.quantite)} vendus</span></span>
                  <span className="montant font-medium">{m(p.chiffre)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </>
  );
}

"use client";

import {
  csvUtilisateurs, definirAbonnement, finProposee, formaterMontant, LIBELLES_ETATS_ACCES, LIBELLES_MOYENS_ABONNEMENT,
  LIBELLES_STATUTS_PAIEMENT, listerPaiementsPlateforme, listerUtilisateursPlateforme, PLANS_ABONNEMENT, prolongerEssai,
  statistiquesPlateforme, TONS_ETATS_ACCES, type EtatAcces, type PlanAbonnement, type UtilisateurPlateforme,
} from "@factureplus/core";
import { useDeferredValue, useState } from "react";

import {
  Alerte, Badge, Bouton, Carte, Case, Champ, Chargement, EnTetePage, Indicateur, Info, Liste, Modale, Recherche, Segments, Tableau, Vide,
} from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

const date = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("fr-FR") : "—");

export default function Administration() {
  const { estAdmin } = useEquipe();
  const [vue, setVue] = useState<"utilisateurs" | "paiements">("utilisateurs");
  const [filtre, setFiltre] = useState<EtatAcces | "">("");
  const [recherche, setRecherche] = useState("");
  const r = useDeferredValue(recherche);
  const [choisi, setChoisi] = useState<UtilisateurPlateforme | null>(null);
  const { donnees, erreur, recharger } = useDonnees(
    () => (estAdmin
      ? Promise.all([statistiquesPlateforme(supabase), listerUtilisateursPlateforme(supabase, r), listerPaiementsPlateforme(supabase)])
      : Promise.resolve(null)),
    [estAdmin, r],
  );

  if (!estAdmin) return <Vide icone="admin" titre="Réservé aux administrateurs de FacturePlus" />;
  if (!donnees && !erreur) return <Chargement />;
  const [stats, utilisateurs, paiements] = donnees ?? [null, [], []];
  const liste = filtre ? utilisateurs.filter((u) => u.etat === filtre) : utilisateurs;

  function exporter() {
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob([`﻿${csvUtilisateurs(liste)}`], { type: "text/csv;charset=utf-8" }));
    lien.download = `utilisateurs-factureplus-${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(lien.href);
  }

  return (
    <>
      <EnTetePage titre="Administration" description="Comptes, abonnements et paiements de la plateforme FacturePlus."
        action={<Bouton variante="secondaire" icone="telecharger" onClick={exporter} disabled={!liste.length}>Exporter les comptes</Bouton>} />
      {erreur && <div className="mb-4"><Alerte>{erreur}</Alerte></div>}

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Indicateur libelle="Comptes" valeur={stats.utilisateurs} detail={`+${stats.nouveaux_7_jours} ces 7 derniers jours`} />
          <Indicateur libelle="Abonnés" valeur={stats.abonnes} detail={`${stats.en_essai} en essai · ${stats.expires} expirés`} ton="succes" />
          <Indicateur libelle="Revenus du mois" valeur={formaterMontant(stats.revenus_mois)} />
          <Indicateur libelle="Revenus totaux" valeur={formaterMontant(stats.revenus_total)}
            detail={stats.paiements_en_attente ? `${stats.paiements_en_attente} paiement(s) en attente` : undefined} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segments libelle="Vue" valeur={vue} onChange={setVue}
          options={[{ valeur: "utilisateurs", libelle: "Utilisateurs" }, { valeur: "paiements", libelle: "Paiements" }]} />
        {vue === "utilisateurs" && (
          <>
            <Liste value={filtre} onChange={(e) => setFiltre(e.target.value as EtatAcces | "")} className="w-40">
              <option value="">Tous les états</option>
              {(["essai", "actif", "expire", "admin"] as const).map((e) => <option key={e} value={e}>{LIBELLES_ETATS_ACCES[e]}</option>)}
            </Liste>
            <Recherche valeur={recherche} onChange={setRecherche} placeholder="E-mail, nom, entreprise…" className="min-w-56 flex-1" />
          </>
        )}
      </div>

      {vue === "utilisateurs" ? (
        <Carte sansMarge>
          <Tableau entetes={[{ libelle: "Compte" }, { libelle: "Entreprise" }, { libelle: "Inscription" }, { libelle: "État" }, { libelle: "Fin d'accès" }, { libelle: "Documents", droite: true }]}
            vide={liste.length === 0 ? <Vide icone="compte" titre="Aucun compte" /> : undefined}>
            {liste.map((u) => (
              <tr key={u.id} onClick={() => setChoisi(u)} className="cursor-pointer hover:bg-surface-retrait">
                <td className="px-4 py-3">
                  <span className="font-medium">{u.nom_complet || u.email}</span>
                  {u.nom_complet && <span className="block text-xs text-muted">{u.email}</span>}
                </td>
                <td className="px-4 py-3 text-muted">{u.entreprise}</td>
                <td className="px-4 py-3 text-muted">{date(u.created_at)}</td>
                <td className="px-4 py-3"><Badge ton={TONS_ETATS_ACCES[u.etat]}>{LIBELLES_ETATS_ACCES[u.etat]}</Badge></td>
                <td className="px-4 py-3 text-muted">{u.etat === "actif" ? date(u.abonnement_fin) : u.etat === "admin" ? "—" : date(u.essai_fin)}</td>
                <td className="px-4 py-3 text-right">{u.documents}</td>
              </tr>
            ))}
          </Tableau>
        </Carte>
      ) : (
        <Carte sansMarge>
          <Tableau entetes={[{ libelle: "Date" }, { libelle: "Compte" }, { libelle: "Formule" }, { libelle: "Moyen" }, { libelle: "Statut" }, { libelle: "Montant", droite: true }]}
            vide={paiements.length === 0 ? <Vide icone="abonnement" titre="Aucun paiement" /> : undefined}>
            {paiements.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-muted">{date(p.paye_le ?? p.created_at)}</td>
                <td className="px-4 py-3">{p.email ?? "Compte supprimé"}</td>
                <td className="px-4 py-3">{PLANS_ABONNEMENT[p.plan].libelle}</td>
                <td className="px-4 py-3 text-muted">{LIBELLES_MOYENS_ABONNEMENT[p.moyen]}</td>
                <td className="px-4 py-3">
                  <Badge ton={p.statut === "paye" ? "succes" : p.statut === "en_attente" ? "attention" : "neutre"}>{LIBELLES_STATUTS_PAIEMENT[p.statut]}</Badge>
                </td>
                <td className="montant px-4 py-3 text-right">{formaterMontant(p.montant)}</td>
              </tr>
            ))}
          </Tableau>
        </Carte>
      )}

      <Modale ouverte={!!choisi} titre={choisi?.entreprise || choisi?.email || "Compte"} onFermer={() => setChoisi(null)}>
        {choisi && <FicheCompte key={choisi.id} u={choisi} onFin={async () => { setChoisi(null); await recharger(); }} />}
      </Modale>
    </>
  );
}

function FicheCompte({ u, onFin }: { u: UtilisateurPlateforme; onFin: () => Promise<void> }) {
  const [plan, setPlan] = useState<PlanAbonnement>("mensuel");
  const [fin, setFin] = useState(() => finProposee("mensuel"));
  const [encaisse, setEncaisse] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  async function executer(cle: string, f: () => Promise<void>) {
    setAction(cle);
    setErreur(null);
    try {
      await f();
      await onFin();
    } catch (e) {
      setErreur((e as Error).message);
      setAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {erreur && <Alerte>{erreur}</Alerte>}
      <div>
        <Badge ton={TONS_ETATS_ACCES[u.etat]}>{LIBELLES_ETATS_ACCES[u.etat]}</Badge>
        <div className="mt-2">
          <Info libelle="E-mail" valeur={u.email ?? "—"} />
          {u.nom_complet && <Info libelle="Nom" valeur={u.nom_complet} />}
          {u.telephone && <Info libelle="Téléphone" valeur={u.telephone} />}
          <Info libelle="Inscription" valeur={date(u.created_at)} />
          <Info libelle="Fin d'essai" valeur={date(u.essai_fin)} />
          {u.abonnement_fin && <Info libelle="Fin d'abonnement" valeur={`${date(u.abonnement_fin)} (${u.abonnement_plan ?? "—"})`} fort />}
          <Info libelle="Documents" valeur={u.documents} />
          <Info libelle="Dernière activité" valeur={date(u.derniere_activite)} />
        </div>
      </div>

      {u.etat !== "admin" && (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
            <p className="font-medium">Activer un abonnement</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Liste libelle="Formule" value={plan} onChange={(e) => { const p = e.target.value as PlanAbonnement; setPlan(p); setFin(finProposee(p)); }}>
                {(Object.keys(PLANS_ABONNEMENT) as PlanAbonnement[]).map((c) => <option key={c} value={c}>{PLANS_ABONNEMENT[c].libelle}</option>)}
              </Liste>
              <Champ libelle="Jusqu'au" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
            </div>
            <Case libelle={`Paiement reçu (${formaterMontant(PLANS_ABONNEMENT[plan].montant)})`} checked={encaisse}
              onChange={(e) => setEncaisse(e.target.checked)} aide="Enregistre le montant dans les revenus (espèces, virement…)" />
            <div>
              <Bouton chargement={action === "activer"}
                onClick={() => executer("activer", () => definirAbonnement(supabase, u.id, plan, fin, encaisse ? PLANS_ABONNEMENT[plan].montant : 0))}>
                Activer
              </Bouton>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Bouton variante="secondaire" chargement={action === "essai"} onClick={() => executer("essai", () => prolongerEssai(supabase, u.id, 7))}>
              Prolonger l&apos;essai de 7 jours
            </Bouton>
            {u.etat !== "expire" && (
              <Bouton variante="danger" chargement={action === "arreter"}
                onClick={() => {
                  if (window.confirm(`Arrêter l'accès de ${u.email} ? Le compte passera en lecture seule.`)) {
                    void executer("arreter", () => definirAbonnement(supabase, u.id, null));
                  }
                }}>
                Arrêter l&apos;accès
              </Bouton>
            )}
          </div>
        </>
      )}
    </div>
  );
}

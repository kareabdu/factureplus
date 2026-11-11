"use client";

import { formaterMontant, LIBELLES_STATUT_ACHAT, listerAchats } from "@stocktracker/core";
import { useRouter } from "next/navigation";

import { Alerte, Badge, Carte, EnTetePage, LienBouton, Tableau, Vide } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function Achats() {
  const { equipeId, parametres } = useEquipe();
  const router = useRouter();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const { donnees, chargement, erreur } = useDonnees(() => listerAchats(supabase, equipeId), [equipeId]);
  const du = (donnees ?? []).filter((a) => a.statut === "recu").reduce((s, a) => s + Math.max(0, a.total - a.montant_paye), 0);

  return (
    <>
      <EnTetePage titre="Achats" description={du > 0 ? `Reste dû aux fournisseurs : ${m(du)}` : "Réceptions de marchandises : le stock et les coûts d'achat se mettent à jour."}
        action={<LienBouton href="/achats/document" icone="plus">Nouvel achat</LienBouton>} />
      {erreur && <Alerte>{erreur}</Alerte>}
      <Carte sansMarge>
        <Tableau entetes={[{ libelle: "Numéro" }, { libelle: "Date" }, { libelle: "Fournisseur" }, { libelle: "Statut" }, { libelle: "Total", droite: true }, { libelle: "Payé", droite: true }]}
          vide={!chargement && donnees?.length === 0 ? <Vide icone="achats" titre="Aucun achat" /> : undefined}>
          {(donnees ?? []).map((a) => (
            <tr key={a.id} onClick={() => router.push(`/achats/document?id=${a.id}`)} className="cursor-pointer hover:bg-surface-retrait">
              <td className="px-4 py-3 font-medium">{a.numero ?? <span className="text-muted">Brouillon</span>}</td>
              <td className="px-4 py-3 text-muted">{new Date(`${a.date}T00:00:00`).toLocaleDateString("fr-FR")}</td>
              <td className="px-4 py-3">{a.fournisseur_nom || "—"}</td>
              <td className="px-4 py-3"><Badge ton={a.statut === "recu" ? "succes" : a.statut === "annule" ? "danger" : "neutre"}>{LIBELLES_STATUT_ACHAT[a.statut]}</Badge></td>
              <td className="montant px-4 py-3 text-right">{m(a.total)}</td>
              <td className="montant px-4 py-3 text-right text-muted">{m(a.montant_paye)}</td>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}

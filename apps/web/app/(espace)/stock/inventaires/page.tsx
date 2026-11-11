"use client";

import { creerInventaire, listerInventaires } from "@stocktracker/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerte, Badge, Bouton, Carte, EnTetePage, Tableau, Vide } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function Inventaires() {
  const { equipeId } = useEquipe();
  const router = useRouter();
  const [creation, setCreation] = useState(false);
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);
  const { donnees, chargement, erreur } = useDonnees(() => listerInventaires(supabase, equipeId), [equipeId]);

  async function nouveau() {
    setCreation(true);
    try {
      router.push(`/stock/inventaire?id=${await creerInventaire(supabase, equipeId)}`);
    } catch (e) {
      setErreurCreation((e as Error).message);
      setCreation(false);
    }
  }

  return (
    <>
      <EnTetePage titre="Inventaires" description="Comptez vos produits : à la clôture, le stock est corrigé et chaque écart est tracé."
        action={<Bouton icone="plus" chargement={creation} onClick={nouveau}>Nouvel inventaire</Bouton>} />
      {(erreur || erreurCreation) && <div className="mb-4"><Alerte>{erreur ?? erreurCreation}</Alerte></div>}
      <Carte sansMarge>
        <Tableau entetes={[{ libelle: "Référence" }, { libelle: "Date" }, { libelle: "Statut" }, { libelle: "Écarts", droite: true }]}
          vide={!chargement && donnees?.length === 0 ? <Vide icone="inventaire" titre="Aucun inventaire" /> : undefined}>
          {(donnees ?? []).map((i) => (
            <tr key={i.id} onClick={() => router.push(`/stock/inventaire?id=${i.id}`)} className="cursor-pointer hover:bg-surface-retrait">
              <td className="px-4 py-3 font-medium">{i.reference}</td>
              <td className="px-4 py-3 text-muted">{new Date(`${i.date}T00:00:00`).toLocaleDateString("fr-FR")}</td>
              <td className="px-4 py-3">{i.statut === "cloture" ? <Badge ton="succes">Clôturé</Badge> : <Badge ton="attention">En cours</Badge>}</td>
              <td className="montant px-4 py-3 text-right">{i.statut === "cloture" ? i.ecarts : "—"}</td>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </>
  );
}

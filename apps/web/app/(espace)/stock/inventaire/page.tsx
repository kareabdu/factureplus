"use client";

import {
  chargerInventaire, cloturerInventaire, formaterQuantite, lireQuantite, saisirComptage, supprimerInventaire,
} from "@stocktracker/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useMemo, useState } from "react";

import { Alerte, Badge, Bouton, Carte, Chargement, EnTetePage, Recherche, Segments, Tableau } from "@/components/ui";
import { useDonnees } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function PageInventaire() {
  return <Suspense fallback={<Chargement />}><Inventaire /></Suspense>;
}

function Inventaire() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { donnees, erreur, recharger, setDonnees } = useDonnees(() => chargerInventaire(supabase, id), [id]);
  const [recherche, setRecherche] = useState("");
  const [vue, setVue] = useState<"tous" | "a_compter" | "ecarts">("tous");
  const [message, setMessage] = useState<{ type: "erreur" | "succes"; texte: string } | null>(null);
  const [cloture, setCloture] = useState(false);
  const r = useDeferredValue(recherche.trim().toLowerCase());

  const lignes = useMemo(() => (donnees?.lignes ?? []).filter((l) => {
    if (vue === "a_compter" && l.quantite_comptee != null) return false;
    if (vue === "ecarts" && (l.quantite_comptee == null || l.quantite_comptee === l.quantite_theorique)) return false;
    return !r || [l.produits?.nom, l.produits?.reference, l.produits?.code_barres].some((v) => v?.toLowerCase().includes(r));
  }), [donnees, vue, r]);

  if (erreur && !donnees) return <Alerte>{erreur}</Alerte>;
  if (!donnees) return <Chargement />;
  const inv = donnees.inventaire;
  const ouvert = inv.statut === "brouillon";
  const comptes = donnees.lignes.filter((l) => l.quantite_comptee != null).length;

  async function compter(produitId: string, q: number | null) {
    setDonnees((d) => d && { ...d, lignes: d.lignes.map((l) => (l.produit_id === produitId ? { ...l, quantite_comptee: q } : l)) });
    try { await saisirComptage(supabase, id, produitId, q); } catch (e) { setMessage({ type: "erreur", texte: (e as Error).message }); void recharger(); }
  }

  // Douchette : un code-barres exact + Entrée ajoute 1 au comptage du produit
  function scanner(code: string) {
    const l = donnees!.lignes.find((x) => x.produits?.code_barres === code.trim());
    if (!l) return false;
    void compter(l.produit_id, (l.quantite_comptee ?? 0) + 1);
    setRecherche("");
    setMessage({ type: "succes", texte: `${l.produits?.nom} : ${formaterQuantite((l.quantite_comptee ?? 0) + 1)}` });
    return true;
  }

  async function cloturer() {
    if (!window.confirm(`${comptes} produit(s) compté(s). Le stock sera corrigé selon vos comptages (les produits non comptés ne changent pas). Clôturer ?`)) return;
    setCloture(true);
    try {
      const n = await cloturerInventaire(supabase, id);
      setMessage({ type: "succes", texte: `Inventaire clôturé : ${n} écart(s) corrigé(s).` });
      await recharger();
    } catch (e) {
      setMessage({ type: "erreur", texte: (e as Error).message });
    } finally {
      setCloture(false);
    }
  }

  return (
    <>
      <EnTetePage titre={`Inventaire ${inv.reference}`} retour="/stock/inventaires"
        description={ouvert ? `${comptes} / ${donnees.lignes.length} produits comptés` : `Clôturé le ${new Date(inv.cloture_le!).toLocaleDateString("fr-FR")} · ${inv.ecarts} écart(s)`}
        action={ouvert ? <>
          <Bouton variante="danger" onClick={async () => { if (window.confirm("Supprimer cet inventaire et ses comptages ?")) { await supprimerInventaire(supabase, id); router.replace("/stock/inventaires"); } }}>Supprimer</Bouton>
          <Bouton chargement={cloture} disabled={comptes === 0} onClick={cloturer}>Clôturer</Bouton>
        </> : undefined} />
      {message && <div className="mb-4"><Alerte type={message.type}>{message.texte}</Alerte></div>}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-64 flex-1" onKeyDown={(e) => { if (e.key === "Enter" && ouvert && scanner(recherche)) e.preventDefault(); }}>
          <Recherche valeur={recherche} onChange={setRecherche} placeholder={ouvert ? "Chercher ou scanner (douchette)…" : "Chercher…"} />
        </div>
        <Segments options={[{ valeur: "tous", libelle: "Tous" }, { valeur: "a_compter", libelle: "À compter" }, { valeur: "ecarts", libelle: "Écarts" }]} valeur={vue} onChange={setVue} />
      </div>
      <Carte sansMarge>
        <Tableau entetes={[{ libelle: "Produit" }, { libelle: "Théorique", droite: true }, { libelle: "Compté", className: "w-36" }, { libelle: "Écart", droite: true }]}>
          {lignes.map((l) => {
            const ecart = l.quantite_comptee == null ? null : l.quantite_comptee - l.quantite_theorique;
            return (
              <tr key={l.produit_id}>
                <td className="px-4 py-2.5"><span className="font-medium">{l.produits?.nom}</span> <span className="text-muted">{l.produits?.reference}</span></td>
                <td className="montant px-4 py-2.5 text-right">{formaterQuantite(l.quantite_theorique)} {l.produits?.unite}</td>
                <td className="px-4 py-2">
                  <input key={`${l.produit_id}-${l.quantite_comptee}`} defaultValue={l.quantite_comptee == null ? "" : formaterQuantite(l.quantite_comptee)}
                    disabled={!ouvert} inputMode="decimal" placeholder="—" aria-label={`Quantité comptée pour ${l.produits?.nom}`}
                    onBlur={(e) => {
                      const t = e.target.value.trim();
                      const q = t ? lireQuantite(t) : null;
                      if (t && q == null) return;
                      if (q !== l.quantite_comptee) void compter(l.produit_id, q);
                    }}
                    className="montant h-9 w-full rounded-lg border border-border bg-surface px-2 text-right text-sm disabled:bg-surface-retrait" />
                </td>
                <td className="px-4 py-2.5 text-right">{ecart != null && ecart !== 0 && <Badge ton={ecart < 0 ? "danger" : "info"}>{ecart > 0 ? "+" : ""}{formaterQuantite(ecart)}</Badge>}</td>
              </tr>
            );
          })}
        </Tableau>
      </Carte>
    </>
  );
}

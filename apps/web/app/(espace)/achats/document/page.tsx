"use client";

import {
  annulerAchat, chargerAchat, enregistrerAchat, formaterMontant, formaterQuantite, LIBELLES_MODE_PAIEMENT, LIBELLES_STATUT_ACHAT, lireMontant,
  lireQuantite, receptionnerAchat, supprimerAchatBrouillon, type Achat, type EnteteAchat, type LigneAchat, type ModePaiement,
} from "@stocktracker/core";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ChoixProduit, ChoixTiers } from "@/components/choix";
import { Icone } from "@/components/icones";
import { Alerte, Badge, Bouton, Carte, Champ, ChampMontant, Chargement, EnTetePage, Info, Liste, Tableau, Zone } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function PageAchat() {
  return <Suspense fallback={<Chargement />}><Aiguillage /></Suspense>;
}

function Aiguillage() {
  const id = useSearchParams().get("id");
  const { donnees, erreur, recharger } = useDonnees(() => (id ? chargerAchat(supabase, id) : Promise.resolve(null)), [id]);
  if (erreur && !donnees) return <Alerte>{erreur}</Alerte>;
  if (id && !donnees) return <Chargement />;
  if (!donnees || donnees.achat.statut === "brouillon") return <Editeur key={id ?? "nouveau"} achat={donnees?.achat ?? null} lignesInitiales={donnees?.lignes ?? []} />;
  return <Consultation achat={donnees.achat} lignes={donnees.lignes} recharger={recharger} />;
}

type Ligne = LigneAchat & { nom: string; unite: string };
const MODES: ModePaiement[] = ["especes", "wave", "orange_money", "virement", "cheque", "credit"];

function Editeur({ achat: a, lignesInitiales }: { achat: Achat | null; lignesInitiales: LigneAchat[] }) {
  const router = useRouter();
  const { equipeId, parametres } = useEquipe();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const [entete, setEntete] = useState<EnteteAchat>(() => a ? {
    fournisseur_id: a.fournisseur_id, fournisseur_nom: a.fournisseur_nom, date: a.date, mode_paiement: a.mode_paiement,
    reference_fournisseur: a.reference_fournisseur, notes: a.notes,
  } : { fournisseur_nom: "", mode_paiement: "especes", date: new Date().toISOString().slice(0, 10) });
  const [lignes, setLignes] = useState<Ligne[]>(() => lignesInitiales.map((l) => ({ ...l, nom: l.produits?.nom ?? "", unite: l.produits?.unite ?? "" })));
  const [paye, setPaye] = useState<number | null>(a?.montant_paye || null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const total = lignes.reduce((s, l) => s + Math.round(l.quantite * l.cout_unitaire), 0);
  const montantPaye = entete.mode_paiement === "credit" ? (paye ?? 0) : (paye ?? total);

  async function enregistrer(receptionner: boolean) {
    if (receptionner && !lignes.length) return setErreur("Ajoutez au moins un produit.");
    if (montantPaye > total) return setErreur("Le montant payé dépasse le total.");
    if (receptionner && !window.confirm("Réceptionner l'achat ? Les quantités seront ajoutées au stock et les coûts d'achat mis à jour.")) return;
    setErreur(null);
    setAction(receptionner ? "recevoir" : "brouillon");
    try {
      const id = await enregistrerAchat(supabase, equipeId, a?.id ?? null, { ...entete, montant_paye: montantPaye }, lignes);
      if (receptionner) await receptionnerAchat(supabase, id);
      router.replace(receptionner ? `/achats/document?id=${id}` : "/achats");
    } catch (e) {
      setErreur((e as Error).message);
      setAction(null);
    }
  }

  return (
    <>
      <EnTetePage titre={a ? "Achat (brouillon)" : "Nouvel achat"} retour="/achats"
        action={<>
          {a && <Bouton variante="danger" icone="supprimer" onClick={async () => { if (window.confirm("Supprimer ce brouillon ?")) { await supprimerAchatBrouillon(supabase, a.id); router.replace("/achats"); } }}>Supprimer</Bouton>}
          <Bouton variante="secondaire" chargement={action === "brouillon"} disabled={!!action} onClick={() => enregistrer(false)}>Enregistrer le brouillon</Bouton>
          <Bouton chargement={action === "recevoir"} disabled={!!action} onClick={() => enregistrer(true)}>Réceptionner</Bouton>
        </>} />
      {erreur && <div className="mb-4"><Alerte>{erreur}</Alerte></div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Carte titre={`Produits reçus (${lignes.length})`} sansMarge>
          <div className="border-b border-border p-4">
            <ChoixProduit onChoisir={(p) => setLignes((ls) => ls.some((l) => l.produit_id === p.id) ? ls
              : [...ls, { produit_id: p.id, nom: p.nom, unite: p.unite, quantite: 1, cout_unitaire: p.prix_achat }])} />
          </div>
          <Tableau entetes={[{ libelle: "Produit" }, { libelle: "Quantité", className: "w-28" }, { libelle: "Coût unitaire", className: "w-36" }, { libelle: "Montant", droite: true }, { libelle: "" }]}
            vide={lignes.length === 0 ? <p className="p-5 text-sm text-muted">Recherchez les produits reçus ci-dessus.</p> : undefined}>
            {lignes.map((l, i) => (
              <tr key={l.produit_id}>
                <td className="px-4 py-2 font-medium">{l.nom} <span className="font-normal text-muted">({l.unite})</span></td>
                <td className="px-4 py-2">
                  <input defaultValue={formaterQuantite(l.quantite)} inputMode="decimal" aria-label="Quantité"
                    onChange={(e) => { const q = lireQuantite(e.target.value); if (q) setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, quantite: q } : x))); }}
                    className="montant h-9 w-full rounded-lg border border-border bg-surface px-2 text-right text-sm" />
                </td>
                <td className="px-4 py-2">
                  <input defaultValue={formaterMontant(l.cout_unitaire, null)} inputMode="numeric" aria-label="Coût unitaire"
                    onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, cout_unitaire: lireMontant(e.target.value) ?? 0 } : x)))}
                    className="montant h-9 w-full rounded-lg border border-border bg-surface px-2 text-right text-sm" />
                </td>
                <td className="montant px-4 py-2 text-right font-medium">{m(Math.round(l.quantite * l.cout_unitaire))}</td>
                <td className="px-2 py-2">
                  <button type="button" aria-label="Retirer" onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                    <Icone nom="supprimer" taille={17} />
                  </button>
                </td>
              </tr>
            ))}
          </Tableau>
        </Carte>
        <div className="flex flex-col gap-6">
          <Carte titre="Fournisseur">
            <div className="flex flex-col gap-4">
              <ChoixTiers type="fournisseurs" libelle="Fournisseur" valeur={entete.fournisseur_id ?? null}
                onChange={(f) => setEntete((e) => ({ ...e, fournisseur_id: f?.id ?? null, fournisseur_nom: f?.nom ?? "" }))} />
              <Champ libelle="N° de facture fournisseur" value={entete.reference_fournisseur ?? ""} onChange={(e) => setEntete((x) => ({ ...x, reference_fournisseur: e.target.value }))} />
              <Champ libelle="Date" type="date" value={entete.date ?? ""} onChange={(e) => setEntete((x) => ({ ...x, date: e.target.value }))} />
            </div>
          </Carte>
          <Carte titre="Paiement">
            <div className="flex flex-col gap-4">
              <Info libelle="Total" valeur={m(total)} fort />
              <Liste libelle="Mode" value={entete.mode_paiement ?? "especes"} onChange={(e) => setEntete((x) => ({ ...x, mode_paiement: e.target.value as ModePaiement }))}>
                {MODES.map((c) => <option key={c} value={c}>{LIBELLES_MODE_PAIEMENT[c]}</option>)}
              </Liste>
              <ChampMontant libelle="Montant payé" symbole={parametres?.symbole_devise} valeur={paye} onChange={setPaye}
                aide={entete.mode_paiement === "credit" ? "Acompte versé" : "Vide = tout est payé"} />
              <Zone libelle="Notes" value={entete.notes ?? ""} onChange={(e) => setEntete((x) => ({ ...x, notes: e.target.value }))} />
            </div>
          </Carte>
        </div>
      </div>
    </>
  );
}

function Consultation({ achat: a, lignes, recharger }: { achat: Achat; lignes: LigneAchat[]; recharger: () => Promise<void> }) {
  const { parametres } = useEquipe();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function annuler() {
    if (!window.confirm("Annuler cet achat ? Les quantités reçues seront retirées du stock. Action définitive.")) return;
    setOccupe(true);
    try { await annulerAchat(supabase, a.id); await recharger(); } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  }

  return (
    <>
      <EnTetePage titre={`Achat ${a.numero}`} retour="/achats"
        description={<span className="flex items-center gap-2">{new Date(`${a.date}T00:00:00`).toLocaleDateString("fr-FR")} · {a.fournisseur_nom || "—"}
          <Badge ton={a.statut === "recu" ? "succes" : "danger"}>{LIBELLES_STATUT_ACHAT[a.statut]}</Badge></span>}
        action={a.statut === "recu" ? <Bouton variante="danger" chargement={occupe} onClick={annuler}>Annuler l&apos;achat</Bouton> : undefined} />
      {erreur && <div className="mb-4"><Alerte>{erreur}</Alerte></div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Carte sansMarge>
          <Tableau entetes={[{ libelle: "Produit" }, { libelle: "Quantité", droite: true }, { libelle: "Coût unitaire", droite: true }, { libelle: "Montant", droite: true }]}>
            {lignes.map((l) => (
              <tr key={l.produit_id}>
                <td className="px-4 py-3"><Link href={`/produits/fiche?id=${l.produit_id}`} className="hover:underline">{l.produits?.nom}</Link></td>
                <td className="montant px-4 py-3 text-right">{formaterQuantite(l.quantite)} {l.produits?.unite}</td>
                <td className="montant px-4 py-3 text-right">{m(l.cout_unitaire)}</td>
                <td className="montant px-4 py-3 text-right font-medium">{m(l.total ?? 0)}</td>
              </tr>
            ))}
          </Tableau>
        </Carte>
        <Carte titre="Montants">
          <Info libelle="Total" valeur={m(a.total)} fort />
          <Info libelle={`Payé (${LIBELLES_MODE_PAIEMENT[a.mode_paiement]})`} valeur={m(a.montant_paye)} />
          {a.total > a.montant_paye && <Info libelle="Reste dû" valeur={m(a.total - a.montant_paye)} fort />}
          {a.reference_fournisseur && <Info libelle="Facture fournisseur" valeur={a.reference_fournisseur} />}
          {a.notes && <p className="mt-3 text-sm text-muted">{a.notes}</p>}
        </Carte>
      </div>
    </>
  );
}

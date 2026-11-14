"use client";

import {
  annulerDocument, calculerTotaux, chargerDocument, convertirProforma, creerBonLivraison, enregistrerDocument, enregistrerReglement,
  formaterMontant, formaterQuantite, LIBELLES_MODE_PAIEMENT, LIBELLES_TYPE_DOCUMENT, CLIENT_DE_PASSAGE, ligneDepuisArticleLibre, ligneDepuisProduit, lireMontant, lireQuantite,
  refuserProforma, resteAPayer, statutAffiche, supprimerBrouillon, supprimerReglement, totalLigne, validerDocument,
  type Document, type EnteteDocument, type LigneDocument, type ModePaiement, type Reglement, type TypeDocument,
} from "@factureplus/core";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { libelleEnregistrementAuto, useEnregistrementAuto } from "@factureplus/core/react";
import { Suspense, useRef, useState, type FormEvent } from "react";

import { ChoixProduit, ChoixTiers } from "@/components/choix";
import { Icone } from "@/components/icones";
import { Alerte, Badge, Bouton, Carte, Champ, ChampMontant, Chargement, EnTetePage, Info, LienBouton, Liste, Modale, Tableau, Zone } from "@/components/ui";
import { useDonnees, useEquipe } from "@/lib/espace";
import { imprimerDocument } from "@/lib/impression";
import { supabase } from "@/lib/supabase";

export default function PageDocument() {
  return <Suspense fallback={<Chargement />}><Aiguillage /></Suspense>;
}

/** Brouillon (ou nouveau) → éditeur ; document validé → consultation. */
function Aiguillage() {
  const params = useSearchParams();
  const id = params.get("id");
  const type = (params.get("type") as TypeDocument) || "facture";
  const modifier = params.get("modifier") === "1";
  // Rechargé aussi en entrant / sortant du mode modification (données à jour après enregistrement)
  const { donnees, erreur, recharger } = useDonnees(() => (id ? chargerDocument(supabase, id) : Promise.resolve(null)), [id, modifier]);
  if (erreur && !donnees) return <Alerte>{erreur}</Alerte>;
  if (id && !donnees) return <Chargement />;
  if (!donnees || donnees.document.statut === "brouillon" || modifier) {
    return <Editeur key={id ?? "nouveau"} type={donnees?.document.type ?? type} document={donnees?.document ?? null} lignesInitiales={donnees?.lignes ?? []} />;
  }
  return <Consultation document={donnees.document} lignes={donnees.lignes} reglements={donnees.reglements} recharger={recharger} />;
}

// ---------------------------------------------------------------------------
// Éditeur de brouillon
// ---------------------------------------------------------------------------

type Ligne = LigneDocument & { cle: number; stock?: number };
let compteur = 0;

/** État d'un document sérialisé (sans les clés d'affichage) pour repérer les modifications. */
function signatureDocument(entete: EnteteDocument, lignes: Ligne[]): string {
  return JSON.stringify([entete, lignes.map(({ produit_id, designation, unite, prix_unitaire, quantite, taxable }) =>
    [produit_id, designation, unite, prix_unitaire, quantite, taxable])]);
}

function Editeur({ type, document: d, lignesInitiales }: { type: TypeDocument; document: Document | null; lignesInitiales: LigneDocument[] }) {
  const router = useRouter();
  const { equipeId, parametres } = useEquipe();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const [entete, setEntete] = useState<EnteteDocument>(() => d ? {
    client_id: d.client_id, client_nom: d.client_nom, client_telephone: d.client_telephone, client_adresse: d.client_adresse,
    date: d.date, echeance: d.echeance, conditions: d.conditions, notes: d.notes,
  } : { client_nom: "", date: new Date().toISOString().slice(0, 10) });
  const [lignes, setLignes] = useState<Ligne[]>(() => lignesInitiales.map((l) => ({ ...l, cle: ++compteur })));
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const brouillon = !d || d.statut === "brouillon";
  // Identifiant du brouillon, créé au premier enregistrement automatique d'un nouveau document
  const [idBrouillon, setIdBrouillon] = useState<string | null>(d?.id ?? null);
  const idRef = useRef<string | null>(d?.id ?? null);
  // Un brouillon suit les paramètres actuels ; un document validé garde sa taxe d'origine
  const totaux = calculerTotaux(lignes, d && !brouillon
    ? { taxe_type: d.taxe_type, taxe_nom: d.taxe_nom, taxe_taux: d.taxe_taux, taxe_incluse: d.taxe_incluse }
    : { taxe_type: parametres?.taxe_type ?? "aucune", taxe_nom: parametres?.taxe_nom ?? "TVA", taxe_taux: parametres?.taxe_taux ?? 0, taxe_incluse: parametres?.taxe_incluse ?? false });
  const maj = (cle: number, c: Partial<Ligne>) => setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, ...c } : l)));
  const libelle = LIBELLES_TYPE_DOCUMENT[type];

  // Brouillon enregistré automatiquement après chaque modification (dès qu'il a une ligne valide)
  const auto = useEnregistrementAuto({
    actif: brouillon && !action && lignes.length > 0 && lignes.every((l) => l.designation.trim() && l.quantite > 0),
    signature: signatureDocument(entete, lignes),
    enregistrer: async () => {
      const id = await enregistrerDocument(supabase, equipeId, type, idRef.current, entete, lignes);
      idRef.current = id;
      setIdBrouillon(id);
    },
  });
  const etatAuto = brouillon ? libelleEnregistrementAuto(auto.etat, auto.heure) : null;

  async function enregistrer(mode: "brouillon" | "valider" | "enregistrer") {
    if (lignes.some((l) => !l.designation.trim() || !(l.quantite > 0))) return setErreur("Chaque ligne doit avoir une désignation et une quantité.");
    if (mode !== "brouillon" && !lignes.length) return setErreur("Ajoutez au moins une ligne.");
    // Facture sans client : « Client de passage » (même règle que valider_document)
    const sansClient = !entete.client_nom?.trim();
    if (mode !== "brouillon" && sansClient && type !== "facture") return setErreur("Indiquez le client.");
    const enteteFinale = mode !== "brouillon" && sansClient ? { ...entete, client_id: null, client_nom: CLIENT_DE_PASSAGE } : entete;
    if (mode === "enregistrer" && d && type === "facture" && totaux.total < d.montant_paye) {
      return setErreur(`Le total ne peut pas être inférieur au montant déjà encaissé (${m(d.montant_paye)}).`);
    }
    setErreur(null);
    setAction(mode);
    try {
      await auto.attendre(); // un enregistrement automatique en cours a pu créer le brouillon
      if (enteteFinale !== entete) setEntete(enteteFinale);
      const id = await enregistrerDocument(supabase, equipeId, type, idRef.current, enteteFinale, lignes);
      idRef.current = id;
      auto.marquer(signatureDocument(enteteFinale, lignes));
      if (mode === "valider") await validerDocument(supabase, id);
      router.replace(mode === "brouillon" ? `/ventes?type=${type}` : `/ventes/document?id=${id}`);
    } catch (e) {
      setErreur((e as Error).message);
      setAction(null);
    }
  }

  return (
    <>
      <EnTetePage titre={!d ? `Nouvelle ${libelle.toLowerCase()}` : brouillon ? `${libelle} (brouillon)` : `Modifier ${d.numero}`}
        retour={d && !brouillon ? `/ventes/document?id=${d.id}` : `/ventes?type=${type}`}
        action={brouillon ? <>
          {idBrouillon && <Bouton variante="danger" icone="supprimer" disabled={!!action} onClick={async () => {
            if (!window.confirm("Supprimer ce brouillon ?")) return;
            setAction("supprimer");
            await auto.attendre();
            await supprimerBrouillon(supabase, idRef.current ?? idBrouillon);
            router.replace(`/ventes?type=${type}`);
          }}>Supprimer</Bouton>}
          <Bouton variante="secondaire" chargement={action === "brouillon"} disabled={!!action} onClick={() => enregistrer("brouillon")}>Enregistrer le brouillon</Bouton>
          <Bouton chargement={action === "valider"} disabled={!!action} onClick={() => enregistrer("valider")}>Valider</Bouton>
        </> : <Bouton chargement={action === "enregistrer"} disabled={!!action} onClick={() => enregistrer("enregistrer")}>Enregistrer les modifications</Bouton>} />
      {etatAuto && (
        <p className={`-mt-3 mb-4 text-xs ${auto.etat === "erreur" ? "text-danger" : "text-muted"}`} role="status">{etatAuto}</p>
      )}
      {erreur && <div className="mb-4"><Alerte>{erreur}</Alerte></div>}
      {!brouillon && type === "facture" && (
        <div className="mb-4"><Alerte type="info">Le numéro est conservé. Les quantités modifiées sont reportées sur le stock à l&apos;enregistrement.</Alerte></div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Carte titre="Client">
            <div className="grid gap-4 sm:grid-cols-2">
              <ChoixTiers type="clients" libelle="Client enregistré" valeur={entete.client_id ?? null}
                onChange={(c) => setEntete((e) => c ? { ...e, client_id: c.id, client_nom: c.nom, client_telephone: c.telephone, client_adresse: c.adresse } : { ...e, client_id: null })} />
              <Champ libelle="Nom affiché" value={entete.client_nom ?? ""} onChange={(ev) => setEntete((e) => ({ ...e, client_nom: ev.target.value }))} disabled={!!entete.client_id} />
              <Champ libelle="Téléphone" value={entete.client_telephone ?? ""} onChange={(ev) => setEntete((e) => ({ ...e, client_telephone: ev.target.value }))} disabled={!!entete.client_id} />
              <Champ libelle="Adresse" value={entete.client_adresse ?? ""} onChange={(ev) => setEntete((e) => ({ ...e, client_adresse: ev.target.value }))} disabled={!!entete.client_id} />
            </div>
          </Carte>

          <Carte titre={`Articles (${lignes.length})`} sansMarge>
            <div className="border-b border-border p-4">
              <ChoixProduit placeholder="Ajouter un produit ou un article déjà saisi : nom, référence, code-barres…"
                onChoisir={(p) => setLignes((ls) => {
                  const i = ls.findIndex((l) => l.produit_id === p.id);
                  if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantite: l.quantite + 1 } : l));
                  return [...ls, { ...ligneDepuisProduit(p), cle: ++compteur, stock: p.quantite }];
                })}
                onChoisirArticle={(a) => setLignes((ls) => {
                  const i = ls.findIndex((l) => !l.produit_id && l.designation.trim().toLowerCase() === a.designation.toLowerCase());
                  if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantite: l.quantite + 1 } : l));
                  return [...ls, { ...ligneDepuisArticleLibre(a), cle: ++compteur }];
                })} />
            </div>
            <Tableau entetes={[{ libelle: "Désignation" }, { libelle: "Quantité", className: "w-28" }, { libelle: "Prix unitaire", className: "w-36" }, { libelle: "Taxable", className: "w-20" }, { libelle: "Montant", droite: true }, { libelle: "" }]}
              vide={lignes.length === 0 ? <p className="p-5 text-sm text-muted">Recherchez un produit ou un article déjà saisi ci-dessus, ou ajoutez une ligne libre.</p> : undefined}>
              {lignes.map((l) => (
                <tr key={l.cle}>
                  <td className="px-4 py-2">
                    {l.produit_id ? <span className="font-medium">{l.designation}</span>
                      : <input value={l.designation} onChange={(e) => maj(l.cle, { designation: e.target.value })} placeholder="Désignation"
                        className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm" />}
                    {l.stock !== undefined && type === "facture" && l.quantite > l.stock && <div className="text-xs text-warning">Stock disponible : {formaterQuantite(l.stock)}</div>}
                  </td>
                  <td className="px-4 py-2">
                    <input defaultValue={formaterQuantite(l.quantite)} key={`q${l.quantite}`} inputMode="decimal" aria-label="Quantité"
                      onBlur={(e) => { const q = lireQuantite(e.target.value); if (q) maj(l.cle, { quantite: q }); }}
                      className="montant h-9 w-full rounded-lg border border-border bg-surface px-2 text-right text-sm" />
                  </td>
                  <td className="px-4 py-2">
                    <input defaultValue={formaterMontant(l.prix_unitaire, null)} inputMode="numeric" aria-label="Prix unitaire"
                      onChange={(e) => maj(l.cle, { prix_unitaire: lireMontant(e.target.value) ?? 0 })}
                      className="montant h-9 w-full rounded-lg border border-border bg-surface px-2 text-right text-sm" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" checked={l.taxable} onChange={(e) => maj(l.cle, { taxable: e.target.checked })} aria-label="Soumis à la taxe" className="size-4 accent-[var(--primary)]" />
                  </td>
                  <td className="montant px-4 py-2 text-right font-medium">{m(totalLigne(l))}</td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))} aria-label="Retirer la ligne" className="rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                      <Icone nom="supprimer" taille={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </Tableau>
            <div className="border-t border-border p-4">
              <Bouton variante="discret" icone="plus" onClick={() => setLignes((ls) => [...ls, { cle: ++compteur, produit_id: null, designation: "", prix_unitaire: 0, quantite: 1, taxable: true }])}>
                Ligne libre (service, frais…)
              </Bouton>
            </div>
          </Carte>
        </div>

        <div className="flex flex-col gap-6">
          <Carte titre="Totaux">
            {totaux.montant_taxe !== 0 && <Info libelle="Sous-total" valeur={m(totaux.sous_total)} />}
            {totaux.montant_taxe !== 0 && <Info libelle={`${parametres?.taxe_nom} ${parametres?.taxe_taux} %${parametres?.taxe_incluse ? " (incluse)" : ""}`} valeur={m(totaux.montant_taxe)} />}
            <Info libelle="Total" valeur={m(totaux.total)} fort />
          </Carte>
          <Carte titre="Détails">
            <div className="flex flex-col gap-4">
              <Champ libelle="Date" type="date" value={entete.date ?? ""} onChange={(e) => setEntete((x) => ({ ...x, date: e.target.value }))} />
              {type === "facture" && <Champ libelle="Échéance" type="date" value={entete.echeance ?? ""} onChange={(e) => setEntete((x) => ({ ...x, echeance: e.target.value || null }))} />}
              <Zone libelle="Conditions" value={entete.conditions ?? ""} onChange={(e) => setEntete((x) => ({ ...x, conditions: e.target.value }))}
                placeholder={parametres?.conditions_defaut ?? undefined} />
              <Zone libelle="Notes" value={entete.notes ?? ""} onChange={(e) => setEntete((x) => ({ ...x, notes: e.target.value }))} />
            </div>
          </Carte>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Consultation d'un document validé
// ---------------------------------------------------------------------------

const MODES: ModePaiement[] = ["especes", "wave", "orange_money", "carte", "virement", "cheque", "autre"];

function Consultation({ document: d, lignes, reglements, recharger }: {
  document: Document; lignes: LigneDocument[]; reglements: Reglement[]; recharger: () => Promise<void>;
}) {
  const router = useRouter();
  const { parametres } = useEquipe();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const [erreur, setErreur] = useState<string | null>(null);
  const [encaisser, setEncaisser] = useState(false);
  const [occupe, setOccupe] = useState<string | null>(null);
  const s = statutAffiche(d);
  const reste = resteAPayer(d);
  const libelle = LIBELLES_TYPE_DOCUMENT[d.type];

  async function executer(cle: string, fn: () => Promise<unknown>) {
    setErreur(null);
    setOccupe(cle);
    try { await fn(); } catch (e) { setErreur((e as Error).message); } finally { setOccupe(null); }
  }

  return (
    <>
      <EnTetePage titre={`${libelle} ${d.numero}`} retour={`/ventes?type=${d.type}`}
        description={<span className="flex items-center gap-2">{new Date(`${d.date}T00:00:00`).toLocaleDateString("fr-FR")} <Badge ton={s.ton}>{s.libelle}</Badge></span>}
        action={<>
          {d.type === "facture" && d.statut === "emis" && <Bouton onClick={() => setEncaisser(true)}>Encaisser</Bouton>}
          <LienBouton href={`/ventes/document?id=${d.id}&modifier=1`} variante="secondaire">Modifier</LienBouton>
          <Bouton variante="secondaire" icone="imprimer" chargement={occupe === "imprimer"} onClick={() => executer("imprimer", () => imprimerDocument(d.id, parametres!))}>Imprimer / PDF</Bouton>
          {d.type === "proforma" && d.statut === "emis" && <>
            <Bouton chargement={occupe === "convertir"} onClick={() => executer("convertir", async () => router.push(`/ventes/document?id=${await convertirProforma(supabase, d.id)}`))}>Accepté → facture</Bouton>
            <Bouton variante="secondaire" onClick={() => executer("refuser", async () => { await refuserProforma(supabase, d.id); await recharger(); })}>Refusé</Bouton>
          </>}
          {d.type === "facture" && (d.statut === "emis" || d.statut === "paye") && (
            <Bouton variante="secondaire" chargement={occupe === "bl"} onClick={() => executer("bl", async () => router.push(`/ventes/document?id=${await creerBonLivraison(supabase, d.id)}`))}>Bon de livraison</Bouton>
          )}
          {["emis", "paye"].includes(d.statut) && (
            <Bouton variante="danger" chargement={occupe === "annuler"} onClick={() => {
              if (window.confirm(d.type === "facture" ? "Annuler la facture ? Le stock sera réintégré. Action définitive." : "Annuler ce document ? Action définitive."))
                void executer("annuler", async () => { await annulerDocument(supabase, d.id); await recharger(); });
            }}>Annuler</Bouton>
          )}
        </>} />
      {erreur && <div className="mb-4"><Alerte>{erreur}</Alerte></div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Carte titre={d.client_nom} sansMarge>
          <Tableau entetes={[{ libelle: "Désignation" }, { libelle: "Quantité", droite: true }, ...(d.type === "bl" ? [] : [{ libelle: "Prix unitaire", droite: true }, { libelle: "Montant", droite: true }])]}>
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">{l.produit_id ? <Link href={`/produits/fiche?id=${l.produit_id}`} className="hover:underline">{l.designation}</Link> : l.designation}</td>
                <td className="montant px-4 py-3 text-right">{formaterQuantite(l.quantite)} {l.unite}</td>
                {d.type !== "bl" && <>
                  <td className="montant px-4 py-3 text-right">{m(l.prix_unitaire)}</td>
                  <td className="montant px-4 py-3 text-right font-medium">{m(l.total ?? 0)}</td>
                </>}
              </tr>
            ))}
          </Tableau>
          {d.notes && <p className="border-t border-border p-4 text-sm text-muted">{d.notes}</p>}
        </Carte>

        <div className="flex flex-col gap-6">
          {d.type !== "bl" && (
            <Carte titre="Montants">
              {d.montant_taxe !== 0 && <Info libelle="Sous-total" valeur={m(d.sous_total)} />}
              {d.montant_taxe !== 0 && <Info libelle={`${d.taxe_nom} ${d.taxe_taux} %`} valeur={m(d.montant_taxe)} />}
              <Info libelle="Total" valeur={m(d.total)} fort />
              {d.type === "facture" && <>
                <Info libelle="Payé" valeur={m(d.montant_paye)} />
                <Info libelle="Reste à payer" valeur={m(reste)} fort={reste > 0} />
              </>}
            </Carte>
          )}
          {reglements.length > 0 && (
            <Carte titre="Règlements" sansMarge>
              <ul className="divide-y divide-border">
                {reglements.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span>{LIBELLES_MODE_PAIEMENT[r.mode]}<span className="block text-xs text-muted">{new Date(`${r.date}T00:00:00`).toLocaleDateString("fr-FR")}{r.reference ? ` · ${r.reference}` : ""}</span></span>
                    <span className="flex items-center gap-2">
                      <span className="montant font-medium">{m(r.montant)}</span>
                      {d.statut !== "annule" && (
                        <button type="button" aria-label="Supprimer le règlement" className="rounded-lg p-1 text-muted hover:bg-danger-soft hover:text-danger"
                          onClick={() => { if (window.confirm("Supprimer ce règlement ?")) void executer("reg", async () => { await supprimerReglement(supabase, r.id); await recharger(); }); }}>
                          <Icone nom="supprimer" taille={16} />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Carte>
          )}
          {d.source_id && <Link href={`/ventes/document?id=${d.source_id}`} className="text-sm text-primary hover:underline">{d.type === "bl" ? "Voir la facture d'origine" : "Voir la proforma d'origine"} →</Link>}
        </div>
      </div>

      <Modale ouverte={encaisser} titre="Encaisser un règlement" onFermer={() => setEncaisser(false)}>
        <FormReglement document={d} reste={reste} onFait={async () => { setEncaisser(false); await recharger(); }} />
      </Modale>
    </>
  );
}

function FormReglement({ document: d, reste, onFait }: { document: Document; reste: number; onFait: () => Promise<void> }) {
  const { parametres } = useEquipe();
  const [montant, setMontant] = useState<number | null>(reste);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!montant || montant <= 0) return setErreur("Montant invalide.");
    setChargement(true);
    try {
      await enregistrerReglement(supabase, d.id, montant, f.get("mode") as ModePaiement, String(f.get("date")) || undefined, String(f.get("reference") || "") || undefined);
      await onFait();
    } catch (err) {
      setErreur((err as Error).message);
      setChargement(false);
    }
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4">
      <p className="text-sm text-muted">Reste à payer : <strong className="montant text-foreground">{formaterMontant(reste, parametres?.symbole_devise)}</strong></p>
      {erreur && <Alerte>{erreur}</Alerte>}
      <ChampMontant libelle="Montant" symbole={parametres?.symbole_devise} valeur={montant} onChange={setMontant} requis />
      <Liste libelle="Mode de paiement" name="mode" defaultValue="especes">
        {MODES.map((c) => <option key={c} value={c}>{LIBELLES_MODE_PAIEMENT[c]}</option>)}
      </Liste>
      <Champ libelle="Date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      <Champ libelle="Référence de transaction" name="reference" />
      <Bouton type="submit" chargement={chargement}>Enregistrer le règlement</Bouton>
    </form>
  );
}

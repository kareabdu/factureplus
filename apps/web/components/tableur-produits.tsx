"use client";

import {
  analyserImportProduits, ecrireTableur, importerProduits, lignesAEnvoyer, listerCategories, listerProduits,
  lireTableur, nomFichierExportProduits, tableauExportProduits, tableauModeleProduits, TYPE_MIME_TABLEUR,
  type AnalyseImportProduits, type BilanImportProduits, type FormatTableur, type Tableau,
} from "@factureplus/core";
import { useRef, useState } from "react";

import { Alerte, Badge, Bouton, Modale } from "@/components/ui";
import { supabase } from "@/lib/supabase";

/** Téléchargement d'un fichier généré dans le navigateur. */
function telecharger(format: FormatTableur, tableau: Tableau, nom: string) {
  const contenu = ecrireTableur(format, tableau, "Produits");
  const url = URL.createObjectURL(new Blob([contenu as BlobPart], { type: TYPE_MIME_TABLEUR[format] }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Boutons « Exporter » (Excel / CSV) : tous les produits de l'équipe, actifs et désactivés. */
export function ExportProduits({ equipeId }: { equipeId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function exporter(format: FormatTableur) {
    setEnCours(true);
    setErreur(null);
    try {
      const [produits, categories] = await Promise.all([
        listerProduits(supabase, equipeId, { inactifs: true }), listerCategories(supabase, equipeId),
      ]);
      telecharger(format, tableauExportProduits(produits, categories), nomFichierExportProduits());
      setOuvert(false);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <>
      <Bouton variante="secondaire" icone="telecharger" onClick={() => setOuvert(true)}>Exporter</Bouton>
      <Modale ouverte={ouvert} titre="Exporter les produits" onFermer={() => setOuvert(false)}>
        <p className="mb-4 text-sm text-muted">
          Tous vos produits (y compris désactivés) avec leur stock actuel. Le fichier peut être modifié puis réimporté.
        </p>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex flex-wrap gap-3">
          <Bouton icone="telecharger" chargement={enCours} onClick={() => exporter("xlsx")}>Excel (.xlsx)</Bouton>
          <Bouton variante="secondaire" icone="telecharger" disabled={enCours} onClick={() => exporter("csv")}>CSV</Bouton>
        </div>
      </Modale>
    </>
  );
}

const LIBELLES_CHAMPS: Record<string, string> = {
  nom: "Nom", reference: "Réf.", code_barres: "Code-barres", categorie: "Catégorie", description: "Description",
  unite: "Unité", prix_vente: "Prix vente", prix_achat: "Prix achat", quantite: "Stock", seuil_alerte: "Seuil", actif: "Actif",
};

/** Résumé des valeurs lues sur une ligne : « Prix vente 1500 · Stock 12 ». */
function resume(valeurs: Record<string, unknown>) {
  return Object.entries(valeurs).filter(([k]) => k !== "nom")
    .map(([k, v]) => `${LIBELLES_CHAMPS[k] ?? k} ${typeof v === "boolean" ? (v ? "oui" : "non") : v}`).join(" · ");
}

/** Bouton « Importer » : modèle, choix du fichier, aperçu ligne par ligne, puis import. */
export function ImportProduits({ equipeId, onImporte }: { equipeId: string; onImporte: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [fichier, setFichier] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState<AnalyseImportProduits | null>(null);
  const [bilan, setBilan] = useState<BilanImportProduits | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreursSeules, setErreursSeules] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  function reinitialiser() {
    setFichier(null);
    setAnalyse(null);
    setBilan(null);
    setErreur(null);
    setErreursSeules(false);
    if (champ.current) champ.current.value = "";
  }

  async function lire(f: File) {
    reinitialiser();
    setEnCours(true);
    try {
      const tableau = lireTableur(f.name, new Uint8Array(await f.arrayBuffer()));
      const existants = await listerProduits(supabase, equipeId, { inactifs: true });
      const a = analyserImportProduits(tableau, existants);
      setFichier(f.name);
      setAnalyse(a);
      setErreursSeules(a.enErreur > 0);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  async function importer() {
    if (!analyse) return;
    setEnCours(true);
    setErreur(null);
    try {
      setBilan(await importerProduits(supabase, equipeId, lignesAEnvoyer(analyse)));
      setAnalyse(null);
      onImporte();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  const aImporter = analyse ? analyse.creations + analyse.misesAJour : 0;
  const lignes = analyse ? analyse.lignes.filter((l) => !erreursSeules || l.erreurs.length) : [];

  return (
    <>
      <Bouton variante="secondaire" icone="importer" onClick={() => { reinitialiser(); setOuvert(true); }}>Importer</Bouton>
      <Modale ouverte={ouvert} titre="Importer des produits" onFermer={() => setOuvert(false)}>
        {erreur && <Alerte>{erreur}</Alerte>}

        {bilan ? (
          <div className="space-y-4">
            <Alerte type="succes">
              Import terminé : {bilan.crees} produit(s) créé(s), {bilan.modifies} mis à jour
              {bilan.stocks_ajustes > 0 && `, ${bilan.stocks_ajustes} stock(s) ajusté(s)`}
              {bilan.categories_creees > 0 && `, ${bilan.categories_creees} catégorie(s) créée(s)`}.
            </Alerte>
            <div className="flex justify-end gap-3">
              <Bouton variante="secondaire" onClick={reinitialiser}>Importer un autre fichier</Bouton>
              <Bouton onClick={() => setOuvert(false)}>Fermer</Bouton>
            </div>
          </div>
        ) : !analyse ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted">
              Fichier Excel (.xlsx) ou CSV, une ligne par produit, avec les en-têtes en première ligne.
              Un produit existant est mis à jour s&apos;il a la même référence, le même code-barres ou, à défaut, le même nom ;
              sinon il est créé. Une cellule vide laisse la valeur actuelle. La quantité en stock est enregistrée
              comme un ajustement de stock (visible dans les mouvements).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted">Modèle :</span>
              <Bouton variante="discret" icone="telecharger" onClick={() => telecharger("xlsx", tableauModeleProduits(), "modele-produits")}>Excel</Bouton>
              <Bouton variante="discret" icone="telecharger" onClick={() => telecharger("csv", tableauModeleProduits(), "modele-produits")}>CSV</Bouton>
            </div>
            <input ref={champ} type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void lire(f); }} />
            <Bouton icone="importer" chargement={enCours} onClick={() => champ.current?.click()} className="w-full">Choisir un fichier…</Bouton>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-muted">{fichier}</p>
            {analyse.erreur ? <Alerte>{analyse.erreur}</Alerte> : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge ton="succes">{analyse.creations} à créer</Badge>
                  <Badge ton="info">{analyse.misesAJour} à mettre à jour</Badge>
                  {analyse.enErreur > 0 && <Badge ton="danger">{analyse.enErreur} en erreur</Badge>}
                </div>
                <p className="text-xs text-muted">
                  Colonnes reconnues : {analyse.colonnes.map((c) => c.entete).join(", ")}
                  {analyse.colonnesIgnorees.length > 0 && <> · ignorées : {analyse.colonnesIgnorees.join(", ")}</>}
                </p>
                {analyse.enErreur > 0 && (
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={erreursSeules} onChange={(e) => setErreursSeules(e.target.checked)} />
                    Afficher seulement les lignes en erreur
                  </label>
                )}
                <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-border">
                      {lignes.slice(0, 300).map((l) => (
                        <tr key={l.numero} className={l.erreurs.length ? "bg-danger-soft" : ""}>
                          <td className="w-12 px-2 py-2 align-top text-muted">L{l.numero}</td>
                          <td className="px-2 py-2">
                            <div className="font-medium">{l.libelle || "—"}</div>
                            {l.erreurs.length
                              ? l.erreurs.map((e) => <div key={e} className="text-danger">{e}</div>)
                              : <div className="text-muted">{resume(l.valeurs as Record<string, unknown>)}</div>}
                          </td>
                          <td className="px-2 py-2 text-right align-top">
                            {!l.erreurs.length && (l.action === "creation" ? <Badge ton="succes">Nouveau</Badge> : <Badge ton="info">Mise à jour</Badge>)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {lignes.length > 300 && <p className="p-2 text-center text-xs text-muted">… et {lignes.length - 300} autres lignes</p>}
                </div>
                {analyse.enErreur > 0 && aImporter > 0 && (
                  <Alerte type="attention">Les {analyse.enErreur} ligne(s) en erreur seront ignorées. Corrigez le fichier pour les inclure.</Alerte>
                )}
              </>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Bouton variante="secondaire" onClick={() => champ.current?.click()} disabled={enCours}>Autre fichier</Bouton>
              <Bouton onClick={importer} chargement={enCours} disabled={!aImporter || !!analyse.erreur}>
                Importer {aImporter} produit(s)
              </Bouton>
            </div>
            <input ref={champ} type="file" accept=".xlsx,.csv,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void lire(f); }} />
          </div>
        )}
      </Modale>
    </>
  );
}

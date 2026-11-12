"use client";

import { envoyerImageProduit, formaterNumero, modifierParametres, TYPES_TAXE, type ModeleDocument, type Parametres, type TypeTaxe } from "@stocktracker/core";
import { useState, type FormEvent } from "react";

import { ChoixModele } from "@/components/choix-modele";
import { Alerte, Bouton, Carte, Case, Champ, Chargement, EnTetePage, Liste, Zone } from "@/components/ui";
import { useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function PageParametres() {
  const { parametres } = useEquipe();
  if (!parametres) return <Chargement />;
  return <Formulaire p={parametres} />;
}

function Formulaire({ p }: { p: Parametres }) {
  const { equipeId, rafraichir } = useEquipe();
  const [taxe, setTaxe] = useState<TypeTaxe>(p.taxe_type);
  const [prefixe, setPrefixe] = useState(p.prefixe_facture);
  const [format, setFormat] = useState(p.format_numero);
  const [logo, setLogo] = useState(p.logo_url);
  const [modele, setModele] = useState<ModeleDocument>(p.modele_document ?? "classique");
  const [couleur, setCouleur] = useState(p.couleur_document);
  const [message, setMessage] = useState<{ type: "erreur" | "succes"; texte: string } | null>(null);
  const [chargement, setChargement] = useState(false);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = (k: string) => String(f.get(k) ?? "").trim() || null;
    setChargement(true);
    setMessage(null);
    try {
      await modifierParametres(supabase, equipeId, {
        nom_entreprise: String(f.get("nom_entreprise")).trim(), adresse: t("adresse"), telephone: t("telephone"), telephone2: t("telephone2"),
        email: t("email"), site_web: t("site_web"), ninea: t("ninea"), rccm: t("rccm"), identifiant_fiscal: t("identifiant_fiscal"),
        prefixe_facture: prefixe, prefixe_proforma: String(f.get("prefixe_proforma")), prefixe_bl: String(f.get("prefixe_bl")), format_numero: format,
        prefixe_ref_produit: String(f.get("prefixe_ref_produit")), ref_produit_auto: f.get("ref_produit_auto") === "on", unite_defaut: String(f.get("unite_defaut")),
        taxe_type: taxe, taxe_nom: String(f.get("taxe_nom") ?? p.taxe_nom), taxe_taux: Number(String(f.get("taxe_taux") ?? "0").replace(",", ".")) || 0,
        taxe_incluse: f.get("taxe_incluse") === "on", conditions_defaut: t("conditions_defaut"), pied_facture: t("pied_facture"),
        couleur_document: couleur, modele_document: modele, logo_url: logo,
      });
      await rafraichir();
      setMessage({ type: "succes", texte: "Paramètres enregistrés." });
    } catch (err) {
      setMessage({ type: "erreur", texte: (err as Error).message });
    } finally {
      setChargement(false);
    }
  }

  async function changerLogo(fichier: File | undefined) {
    if (!fichier) return;
    try { setLogo(await envoyerImageProduit(supabase, equipeId, fichier, fichier.type)); } catch (e) { setMessage({ type: "erreur", texte: (e as Error).message }); }
  }

  return (
    <>
      <EnTetePage titre="Entreprise et factures" description="Ces informations apparaissent sur vos factures, proformas et bons de livraison." />
      <form onSubmit={envoyer} className="flex max-w-3xl flex-col gap-6">
        {message && <Alerte type={message.type}>{message.texte}</Alerte>}
        <Carte titre="Entreprise">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo && <img src={logo} alt="Logo" className="h-16 max-w-40 rounded-lg object-contain" />}
              <label className="text-sm">
                <span className="mb-1.5 block font-medium">Logo</span>
                <input type="file" accept="image/*" onChange={(e) => void changerLogo(e.target.files?.[0])}
                  className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary" />
              </label>
            </div>
            <Champ libelle="Nom" name="nom_entreprise" defaultValue={p.nom_entreprise} required className="sm:col-span-2" />
            <Champ libelle="Adresse" name="adresse" defaultValue={p.adresse ?? ""} className="sm:col-span-2" />
            <Champ libelle="Téléphone" name="telephone" defaultValue={p.telephone ?? ""} />
            <Champ libelle="Téléphone 2" name="telephone2" defaultValue={p.telephone2 ?? ""} />
            <Champ libelle="E-mail" name="email" type="email" defaultValue={p.email ?? ""} />
            <Champ libelle="Site web" name="site_web" defaultValue={p.site_web ?? ""} />
            <Champ libelle="NINEA" name="ninea" defaultValue={p.ninea ?? ""} />
            <Champ libelle="RCCM" name="rccm" defaultValue={p.rccm ?? ""} />
            <Champ libelle="Identifiant fiscal (NIF)" name="identifiant_fiscal" defaultValue={p.identifiant_fiscal ?? ""} />
          </div>
        </Carte>
        <Carte titre="Numérotation">
          <div className="grid gap-4 sm:grid-cols-3">
            <Champ libelle="Préfixe factures" value={prefixe} onChange={(e) => setPrefixe(e.target.value)} />
            <Champ libelle="Préfixe proformas" name="prefixe_proforma" defaultValue={p.prefixe_proforma} />
            <Champ libelle="Préfixe livraisons" name="prefixe_bl" defaultValue={p.prefixe_bl} />
            <Champ libelle="Format" value={format} onChange={(e) => setFormat(e.target.value)} className="sm:col-span-2"
              aide={`{PREFIX}, {YYYY}, {N:04d} — exemple : ${formaterNumero(format, prefixe, new Date().getFullYear(), 1)}`} />
            <Champ libelle="Unité par défaut" name="unite_defaut" defaultValue={p.unite_defaut} />
            <Champ libelle="Préfixe réf. produit" name="prefixe_ref_produit" defaultValue={p.prefixe_ref_produit} />
            <div className="sm:col-span-2 sm:self-end"><Case libelle="Référence produit automatique" name="ref_produit_auto" defaultChecked={p.ref_produit_auto} /></div>
          </div>
        </Carte>
        <Carte titre="Taxe">
          <div className="grid gap-4 sm:grid-cols-3">
            <Liste libelle="Type" value={taxe} onChange={(e) => setTaxe(e.target.value as TypeTaxe)}>
              {TYPES_TAXE.map((t) => <option key={t.valeur} value={t.valeur}>{t.libelle}</option>)}
            </Liste>
            {taxe !== "aucune" && <>
              <Champ libelle="Nom" name="taxe_nom" defaultValue={p.taxe_nom} />
              <Champ libelle="Taux (%)" name="taxe_taux" inputMode="decimal" defaultValue={String(p.taxe_taux)} />
              {taxe !== "deduction" && <div className="sm:col-span-3"><Case libelle="Prix TTC (taxe incluse dans les prix)" name="taxe_incluse" defaultChecked={p.taxe_incluse} /></div>}
            </>}
          </div>
        </Carte>
        <Carte titre="Modèle de facture">
          <ChoixModele modele={modele} couleur={couleur} parametres={{ ...p, logo_url: logo }}
            onChange={(c) => { if (c.modele) setModele(c.modele); if (c.couleur) setCouleur(c.couleur); }} />
        </Carte>
        <Carte titre="Textes des factures">
          <div className="grid gap-4">
            <Zone libelle="Conditions par défaut" name="conditions_defaut" defaultValue={p.conditions_defaut ?? ""} placeholder="Ex. Paiement à 30 jours" />
            <Zone libelle="Pied de page" name="pied_facture" defaultValue={p.pied_facture ?? ""} placeholder="Ex. Merci pour votre confiance" />
          </div>
        </Carte>
        <div><Bouton type="submit" chargement={chargement}>Enregistrer</Bouton></div>
      </form>
    </>
  );
}

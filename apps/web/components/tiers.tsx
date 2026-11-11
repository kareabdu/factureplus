"use client";

import { useDeferredValue, useState, type FormEvent } from "react";

import { Alerte, Bouton, Carte, Champ, EnTetePage, Modale, Recherche, Tableau, Vide, Zone } from "@/components/ui";
import type { NomIcone } from "@/components/icones";
import { useDonnees, useEquipe } from "@/lib/espace";

export interface Tiers {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  contact?: string | null;
  notes: string | null;
}
type Saisie = Omit<Tiers, "id">;

/** Page commune clients / fournisseurs : liste, recherche, création et modification en fenêtre. */
export function PageTiers({ titre, icone, singulier, avecContact = false, lister, creer, modifier, supprimer }: {
  titre: string;
  icone: NomIcone;
  singulier: string;
  avecContact?: boolean;
  lister: (equipeId: string, recherche: string) => Promise<Tiers[]>;
  creer: (equipeId: string, s: Saisie) => Promise<unknown>;
  modifier: (id: string, s: Saisie) => Promise<unknown>;
  supprimer: (id: string) => Promise<unknown>;
}) {
  const { equipeId } = useEquipe();
  const [recherche, setRecherche] = useState("");
  const r = useDeferredValue(recherche);
  const [edition, setEdition] = useState<Tiers | "nouveau" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const { donnees, chargement: chargementListe, erreur: erreurListe, recharger } = useDonnees(() => lister(equipeId, r), [equipeId, r]);

  async function enregistrer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = (k: string) => String(f.get(k) ?? "").trim() || null;
    const s: Saisie = { nom: String(f.get("nom")).trim(), telephone: t("telephone"), email: t("email"), adresse: t("adresse"), notes: t("notes"),
      ...(avecContact ? { contact: t("contact") } : {}) };
    setChargement(true);
    try {
      if (edition === "nouveau") await creer(equipeId, s);
      else if (edition) await modifier(edition.id, s);
      setEdition(null);
      await recharger();
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setChargement(false);
    }
  }

  async function effacer(t: Tiers) {
    if (!window.confirm(`Supprimer « ${t.nom} » ?`)) return;
    try {
      await supprimer(t.id);
      setEdition(null);
      await recharger();
    } catch (err) {
      setErreur((err as Error).message);
    }
  }

  const courant = edition && edition !== "nouveau" ? edition : null;

  return (
    <>
      <EnTetePage titre={titre} action={<Bouton icone="plus" onClick={() => { setErreur(null); setEdition("nouveau"); }}>Nouveau {singulier}</Bouton>} />
      <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom ou téléphone…" className="mb-4 max-w-md" />
      {erreurListe && <Alerte>{erreurListe}</Alerte>}
      <Carte sansMarge>
        <Tableau entetes={[{ libelle: "Nom" }, { libelle: "Téléphone" }, { libelle: avecContact ? "Contact" : "E-mail" }, { libelle: "Adresse" }]}
          vide={!chargementListe && donnees?.length === 0 ? <Vide icone={icone} titre={`Aucun ${singulier}`} /> : undefined}>
          {(donnees ?? []).map((t) => (
            <tr key={t.id} onClick={() => { setErreur(null); setEdition(t); }} className="cursor-pointer hover:bg-surface-retrait">
              <td className="px-4 py-3 font-medium">{t.nom}</td>
              <td className="px-4 py-3 text-muted">{t.telephone}</td>
              <td className="px-4 py-3 text-muted">{avecContact ? t.contact : t.email}</td>
              <td className="px-4 py-3 text-muted">{t.adresse}</td>
            </tr>
          ))}
        </Tableau>
      </Carte>

      <Modale ouverte={!!edition} titre={courant ? courant.nom : `Nouveau ${singulier}`} onFermer={() => setEdition(null)}>
        <form key={courant?.id ?? "nouveau"} onSubmit={enregistrer} className="flex flex-col gap-4">
          {erreur && <Alerte>{erreur}</Alerte>}
          <Champ libelle="Nom" name="nom" defaultValue={courant?.nom} required autoFocus />
          <Champ libelle="Téléphone" name="telephone" type="tel" defaultValue={courant?.telephone ?? ""} />
          {avecContact && <Champ libelle="Personne à contacter" name="contact" defaultValue={courant?.contact ?? ""} />}
          <Champ libelle="E-mail" name="email" type="email" defaultValue={courant?.email ?? ""} />
          <Champ libelle="Adresse" name="adresse" defaultValue={courant?.adresse ?? ""} />
          <Zone libelle="Notes" name="notes" defaultValue={courant?.notes ?? ""} />
          <div className="flex flex-wrap justify-between gap-2">
            {courant ? <Bouton variante="danger" icone="supprimer" onClick={() => effacer(courant)}>Supprimer</Bouton> : <span />}
            <Bouton type="submit" chargement={chargement}>Enregistrer</Bouton>
          </div>
        </form>
      </Modale>
    </>
  );
}

"use client";

import { accesActif, formaterMontant, joursEssaiRestants, modifierProfil, TARIFS, traduireErreur } from "@stocktracker/core";
import { useState, type FormEvent } from "react";

import { Alerte, Bouton, Carte, Champ, Chargement, EnTetePage, Info } from "@/components/ui";
import { useEquipe, useSession } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function Compte() {
  const { userId, email } = useSession();
  const { profil, rafraichir } = useEquipe();
  const [message, setMessage] = useState<{ type: "erreur" | "succes"; texte: string } | null>(null);
  const [chargement, setChargement] = useState<string | null>(null);
  if (!profil || !userId) return <Chargement />;
  const essai = joursEssaiRestants(profil);

  async function profilEnvoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setChargement("profil");
    try {
      await modifierProfil(supabase, userId!, { nom_complet: String(f.get("nom")).trim() || null, telephone: String(f.get("telephone")).trim() || null });
      await rafraichir();
      setMessage({ type: "succes", texte: "Profil enregistré." });
    } catch (err) {
      setMessage({ type: "erreur", texte: (err as Error).message });
    } finally {
      setChargement(null);
    }
  }

  async function motDePasse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const mdp = String(new FormData(form).get("motDePasse"));
    if (mdp.length < 8) return setMessage({ type: "erreur", texte: "Le mot de passe doit contenir au moins 8 caractères." });
    setChargement("mdp");
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setChargement(null);
    if (error) return setMessage({ type: "erreur", texte: traduireErreur(error) });
    form.reset();
    setMessage({ type: "succes", texte: "Mot de passe modifié." });
  }

  return (
    <>
      <EnTetePage titre="Mon compte" description={email ?? undefined} />
      <div className="flex max-w-xl flex-col gap-6">
        {message && <Alerte type={message.type}>{message.texte}</Alerte>}
        <Carte titre="Abonnement">
          {profil.abonnement_statut === "actif" ? (
            <>
              <Info libelle="Formule" valeur={profil.abonnement_plan === "annuel" ? "Annuelle" : "Mensuelle"} fort />
              {profil.abonnement_fin && <Info libelle="Jusqu'au" valeur={new Date(profil.abonnement_fin).toLocaleDateString("fr-FR")} />}
            </>
          ) : <Info libelle="Essai gratuit" valeur={essai > 0 ? `${essai} jour(s) restant(s)` : "Terminé"} fort />}
          {!accesActif(profil) && <div className="mt-3"><Alerte type="attention">Votre accès a expiré.</Alerte></div>}
          <p className="mt-3 text-sm text-muted">
            Mensuel {formaterMontant(TARIFS.mensuel)} · Annuel {formaterMontant(TARIFS.annuel)}. Le paiement Wave / Orange Money arrive bientôt.
          </p>
        </Carte>
        <Carte titre="Profil">
          <form onSubmit={profilEnvoyer} className="flex flex-col gap-4">
            <Champ libelle="Nom" name="nom" defaultValue={profil.nom_complet ?? ""} autoComplete="name" />
            <Champ libelle="Téléphone" name="telephone" type="tel" defaultValue={profil.telephone ?? ""} />
            <div><Bouton type="submit" chargement={chargement === "profil"}>Enregistrer</Bouton></div>
          </form>
        </Carte>
        <Carte titre="Mot de passe">
          <form onSubmit={motDePasse} className="flex flex-col gap-4">
            <Champ libelle="Nouveau mot de passe" name="motDePasse" type="password" autoComplete="new-password" required />
            <div><Bouton type="submit" variante="secondaire" chargement={chargement === "mdp"}>Changer le mot de passe</Bouton></div>
          </form>
        </Carte>
      </div>
    </>
  );
}

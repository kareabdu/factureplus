"use client";

import {
  LIBELLES_ETATS_ACCES, modifierProfil, MOT_CONFIRMATION_SUPPRESSION, supprimerMonCompte, TONS_ETATS_ACCES, traduireErreur,
} from "@factureplus/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Alerte, Badge, Bouton, Carte, Champ, Chargement, EnTetePage, Info, LienBouton, Modale } from "@/components/ui";
import { useEquipe, useSession } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function PageCompte() {
  return <Suspense fallback={<Chargement />}><Compte /></Suspense>;
}

function Compte() {
  // Arrivée par le lien « Mot de passe oublié » : l'utilisateur doit choisir un nouveau mot de passe
  const reinitialisation = useSearchParams().get("reinitialisation") === "1";
  const { userId, email } = useSession();
  const { profil, abonnement, rafraichir, equipe } = useEquipe();
  const router = useRouter();
  const [suppression, setSuppression] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "erreur" | "succes"; texte: string } | null>(null);
  const [chargement, setChargement] = useState<string | null>(null);
  if (!profil || !userId) return <Chargement />;

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

  async function supprimerCompte() {
    setChargement("suppression");
    setErreurSuppression(null);
    try {
      await supprimerMonCompte(supabase, equipe?.id ?? null);
      await supabase.auth.signOut();
      router.replace("/connexion");
    } catch (err) {
      setErreurSuppression(traduireErreur(err));
      setChargement(null);
    }
  }

  return (
    <>
      <EnTetePage titre="Mon compte" description={email ?? undefined} />
      <div className="flex max-w-xl flex-col gap-6">
        {message && <Alerte type={message.type}>{message.texte}</Alerte>}
        <Carte titre="Abonnement" action={abonnement && <Badge ton={TONS_ETATS_ACCES[abonnement.etat]}>{LIBELLES_ETATS_ACCES[abonnement.etat]}</Badge>}>
          {abonnement?.etat === "admin" ? <p className="text-sm text-muted">Accès permanent (administrateur).</p> : abonnement?.fin && (
            <Info libelle={abonnement.etat === "expire" ? "Terminé le" : "Jusqu'au"} valeur={abonnement.fin.toLocaleDateString("fr-FR")} fort />
          )}
          <div className="mt-3"><LienBouton href="/abonnement" variante="secondaire" icone="abonnement">Gérer mon abonnement</LienBouton></div>
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
            {reinitialisation && !message && <Alerte type="info">Choisissez votre nouveau mot de passe.</Alerte>}
            <Champ libelle="Nouveau mot de passe" name="motDePasse" type="password" autoComplete="new-password" required
              autoFocus={reinitialisation} aide="8 caractères minimum" />
            <div><Bouton type="submit" variante="secondaire" chargement={chargement === "mdp"}>Changer le mot de passe</Bouton></div>
          </form>
        </Carte>
        <Carte titre="Supprimer mon compte">
          <p className="mb-3 text-sm text-muted">
            Supprime définitivement votre compte, votre entreprise et toutes ses données (produits, ventes, achats,
            dépenses, fichiers). Cette action est irréversible.
          </p>
          <Bouton variante="danger" icone="supprimer" onClick={() => { setConfirmation(""); setErreurSuppression(null); setSuppression(true); }}>
            Supprimer mon compte
          </Bouton>
        </Carte>
      </div>

      <Modale ouverte={suppression} titre="Supprimer mon compte" onFermer={() => chargement !== "suppression" && setSuppression(false)}>
        <div className="flex flex-col gap-4">
          <Alerte>
            Votre compte, {equipe ? <>l&apos;entreprise « {equipe.nom} » </> : "votre entreprise "}et toutes leurs données
            seront supprimés définitivement. Un abonnement en cours n&apos;est pas remboursé.
          </Alerte>
          {erreurSuppression && <Alerte>{erreurSuppression}</Alerte>}
          <Champ libelle={`Tapez ${MOT_CONFIRMATION_SUPPRESSION} pour confirmer`} value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" autoFocus />
          <div className="flex justify-end gap-2">
            <Bouton variante="secondaire" onClick={() => setSuppression(false)} disabled={chargement === "suppression"}>Annuler</Bouton>
            <Bouton variante="danger" icone="supprimer" chargement={chargement === "suppression"}
              disabled={confirmation.trim().toUpperCase() !== MOT_CONFIRMATION_SUPPRESSION} onClick={supprimerCompte}>
              Supprimer définitivement
            </Bouton>
          </div>
        </div>
      </Modale>
    </>
  );
}

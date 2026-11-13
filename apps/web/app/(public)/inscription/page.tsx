"use client";

import { traduireErreur } from "@factureplus/core";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { BoutonGoogle } from "@/components/bouton-google";
import { Alerte, Bouton, Champ } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function Inscription() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const motDePasse = String(f.get("motDePasse"));
    if (motDePasse.length < 8) return setErreur("Le mot de passe doit contenir au moins 8 caractères.");
    setErreur(null);
    setChargement(true);
    const { data, error } = await supabase.auth.signUp({
      email, password: motDePasse,
      options: { data: { nom_complet: String(f.get("nom")).trim() }, emailRedirectTo: `${window.location.origin}/` },
    });
    setChargement(false);
    if (error) return setErreur(traduireErreur(error));
    if (!data.session) setEnvoye(email);
  }

  if (envoye) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Vérifiez vos e-mails</h1>
        <Alerte type="succes">Un lien de confirmation a été envoyé à {envoye}. Ouvrez-le pour activer votre compte.</Alerte>
        <Link href="/connexion" className="text-center text-sm font-medium text-primary hover:underline">Aller à la connexion</Link>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Créer un compte</h1>
      <p className="-mt-2 text-sm text-muted">7 jours d&apos;essai gratuit, sans engagement.</p>
      {erreur && <Alerte>{erreur}</Alerte>}
      <BoutonGoogle onErreur={setErreur} />
      <Champ libelle="Votre nom" name="nom" autoComplete="name" required />
      <Champ libelle="E-mail" name="email" type="email" autoComplete="email" required />
      <Champ libelle="Mot de passe" name="motDePasse" type="password" autoComplete="new-password" required aide="8 caractères minimum" />
      <Bouton type="submit" chargement={chargement}>Créer mon compte</Bouton>
      <p className="text-center text-sm text-muted">
        Déjà un compte ? <Link href="/connexion" className="font-medium text-primary hover:underline">Se connecter</Link>
      </p>
    </form>
  );
}

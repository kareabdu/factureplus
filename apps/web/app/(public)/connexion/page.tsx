"use client";

import { traduireErreur } from "@factureplus/core";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { BoutonGoogle } from "@/components/bouton-google";
import { Alerte, Bouton, Champ } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function Connexion() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")).trim(), password: String(f.get("motDePasse")) });
    setChargement(false);
    if (error) setErreur(traduireErreur(error));
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Connexion</h1>
      {erreur && <Alerte>{erreur}</Alerte>}
      <BoutonGoogle onErreur={setErreur} />
      <Champ libelle="E-mail" name="email" type="email" autoComplete="email" required />
      <Champ libelle="Mot de passe" name="motDePasse" type="password" autoComplete="current-password" required />
      <Bouton type="submit" chargement={chargement}>Se connecter</Bouton>
      <Link href="/mot-de-passe-oublie" className="text-center text-sm text-primary hover:underline">Mot de passe oublié ?</Link>
      <p className="text-center text-sm text-muted">
        Pas encore de compte ? <Link href="/inscription" className="font-medium text-primary hover:underline">Créer un compte</Link>
      </p>
      <p className="text-center text-xs text-muted">
        <Link href="/assistance" className="hover:underline">Assistance</Link> · <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
      </p>
    </form>
  );
}

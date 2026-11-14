"use client";

import { traduireErreur } from "@factureplus/core";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { BoutonGoogle } from "@/components/bouton-google";
import { Alerte, Bouton, Champ } from "@/components/ui";
import { supabase } from "@/lib/supabase";

/** Inscription confirmée par un code reçu par e-mail (modèle « Confirm signup » : {{ .Token }}). */
export default function Inscription() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
    // Sans session : confirmation de l'e-mail par code
    if (!data.session) setEnvoye(email);
  }

  async function confirmer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    setErreur(null);
    setInfo(null);
    setChargement(true);
    const { error } = await supabase.auth.verifyOtp({ email: envoye!, token: code, type: "signup" });
    setChargement(false);
    // En cas de succès, la session ouvre l'espace (redirection du cadre public)
    if (error) setErreur("Code invalide ou expiré.");
  }

  async function renvoyer() {
    setErreur(null);
    setInfo(null);
    const { error } = await supabase.auth.resend({ type: "signup", email: envoye! });
    if (error) setErreur(traduireErreur(error));
    else setInfo("Nouveau code envoyé.");
  }

  if (envoye) {
    return (
      <form onSubmit={confirmer} className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Confirmez votre e-mail</h1>
        <Alerte type="info">E-mail envoyé à {envoye} : saisissez le code reçu ou ouvrez le lien qu&apos;il contient (pensez aux courriers indésirables).</Alerte>
        {erreur && <Alerte>{erreur}</Alerte>}
        {info && <Alerte type="succes">{info}</Alerte>}
        <Champ libelle="Code reçu" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required autoFocus />
        <Bouton type="submit" chargement={chargement}>Confirmer</Bouton>
        <button type="button" onClick={renvoyer} className="text-sm text-primary hover:underline">Renvoyer un code</button>
        <Link href="/connexion" className="text-center text-sm text-primary hover:underline">Aller à la connexion</Link>
      </form>
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

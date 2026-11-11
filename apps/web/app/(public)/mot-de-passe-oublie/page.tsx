"use client";

import { traduireErreur } from "@stocktracker/core";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Alerte, Bouton, Champ } from "@/components/ui";
import { supabase } from "@/lib/supabase";

/** Réinitialisation par code reçu par e-mail (même parcours que sur mobile). */
export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [etape, setEtape] = useState<"email" | "code">("email");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function demander(e?: FormEvent) {
    e?.preventDefault();
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setChargement(false);
    if (error) return setErreur(traduireErreur(error));
    setEtape("code");
  }

  async function changer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const motDePasse = String(f.get("motDePasse"));
    if (motDePasse.length < 8) return setErreur("Le mot de passe doit contenir au moins 8 caractères.");
    setErreur(null);
    setChargement(true);
    const v = await supabase.auth.verifyOtp({ email: email.trim(), token: String(f.get("code")).trim(), type: "recovery" });
    if (v.error) {
      setChargement(false);
      return setErreur("Code invalide ou expiré.");
    }
    const r = await supabase.auth.updateUser({ password: motDePasse });
    setChargement(false);
    if (r.error) setErreur(traduireErreur(r.error));
  }

  return etape === "email" ? (
    <form onSubmit={demander} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Mot de passe oublié</h1>
      <p className="-mt-2 text-sm text-muted">Nous vous envoyons un code par e-mail.</p>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <Bouton type="submit" chargement={chargement}>Recevoir un code</Bouton>
      <Link href="/connexion" className="text-center text-sm text-primary hover:underline">Retour à la connexion</Link>
    </form>
  ) : (
    <form onSubmit={changer} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Nouveau mot de passe</h1>
      <Alerte type="info">Code envoyé à {email.trim()} (pensez aux courriers indésirables).</Alerte>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="Code reçu" name="code" inputMode="numeric" autoComplete="one-time-code" required />
      <Champ libelle="Nouveau mot de passe" name="motDePasse" type="password" autoComplete="new-password" required />
      <Bouton type="submit" chargement={chargement}>Changer le mot de passe</Bouton>
      <button type="button" onClick={() => demander()} className="text-sm text-primary hover:underline">Renvoyer un code</button>
    </form>
  );
}

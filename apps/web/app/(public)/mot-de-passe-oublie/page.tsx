"use client";

import { traduireErreur } from "@factureplus/core";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Alerte, Bouton, Champ } from "@/components/ui";
import { supabase } from "@/lib/supabase";

/**
 * Réinitialisation par lien reçu par e-mail : le lien connecte l'utilisateur et l'amène sur
 * « Mon compte » (?reinitialisation=1) pour choisir son nouveau mot de passe.
 */
export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function demander(e?: FormEvent) {
    e?.preventDefault();
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/compte?reinitialisation=1`,
    });
    setChargement(false);
    if (error) return setErreur(traduireErreur(error));
    setEnvoye(true);
  }

  return envoye ? (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Vérifiez vos e-mails</h1>
      <Alerte type="succes">
        Un lien a été envoyé à {email.trim()} (pensez aux courriers indésirables). Ouvrez-le pour choisir un nouveau mot de passe.
      </Alerte>
      {erreur && <Alerte>{erreur}</Alerte>}
      <button type="button" onClick={() => demander()} disabled={chargement} className="text-sm text-primary hover:underline">
        Renvoyer le lien
      </button>
      <Link href="/connexion" className="text-center text-sm text-primary hover:underline">Retour à la connexion</Link>
    </div>
  ) : (
    <form onSubmit={demander} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Mot de passe oublié</h1>
      <p className="-mt-2 text-sm text-muted">Nous vous envoyons un lien par e-mail.</p>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <Bouton type="submit" chargement={chargement}>Recevoir un lien</Bouton>
      <Link href="/connexion" className="text-center text-sm text-primary hover:underline">Retour à la connexion</Link>
    </form>
  );
}

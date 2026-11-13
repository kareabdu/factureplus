"use client";

import { creerEquipe, messageAbonnement } from "@factureplus/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { BarreLaterale } from "@/components/barre-laterale";
import { Icone } from "@/components/icones";
import { Alerte, Bouton, Champ, Chargement, Logo } from "@/components/ui";
import { EspaceProvider, useEquipe, useSession } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

/** Toutes les pages qui demandent d'être connecté. */
export function CadreEspace({ children }: { children: ReactNode }) {
  const { session, chargement } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!chargement && !session) router.replace("/connexion");
  }, [chargement, session, router]);

  if (chargement || !session) return <Chargement />;

  return (
    <EspaceProvider>
      <Cadre>{children}</Cadre>
    </EspaceProvider>
  );
}

function Cadre({ children }: { children: ReactNode }) {
  const { chargement, erreur, equipe, rafraichir } = useEquipe();

  if (erreur) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 p-6">
        <Alerte>{erreur}</Alerte>
        <Bouton variante="secondaire" onClick={() => void rafraichir()}>Réessayer</Bouton>
      </div>
    );
  }
  if (chargement) return <Chargement />;
  if (!equipe) return <Bienvenue />;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <BarreLaterale />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <BandeauAbonnement />
          {children}
        </div>
      </main>
    </div>
  );
}

/** Fin d'essai ou d'abonnement proche, ou accès expiré (lecture seule). */
function BandeauAbonnement() {
  const { abonnement } = useEquipe();
  const pathname = usePathname();
  const message = abonnement ? messageAbonnement(abonnement) : null;
  if (!abonnement || !message || pathname === "/abonnement") return null;
  const expire = abonnement.etat === "expire";
  return (
    <Link href="/abonnement" className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${
      expire ? "border-danger/40 bg-danger-soft text-danger hover:border-danger" : "border-warning/40 bg-warning-soft text-warning hover:border-warning"}`}>
      <Icone nom={expire ? "alerte" : "abonnement"} taille={18} />
      <span className="flex-1 text-foreground">{message}</span>
      <span className="font-semibold whitespace-nowrap">{expire ? "S'abonner" : "Voir les offres"} →</span>
    </Link>
  );
}

/** Première connexion : création de l'entreprise. */
function Bienvenue() {
  const { rafraichir } = useEquipe();
  const { deconnecter } = useSession();
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function creer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nom = String(new FormData(e.currentTarget).get("nom")).trim();
    if (nom.length < 2) return setErreur("Indiquez le nom de votre commerce.");
    setChargement(true);
    try {
      await creerEquipe(supabase, nom);
      await rafraichir();
    } catch (err) {
      setErreur((err as Error).message);
      setChargement(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <Logo className="mb-8" />
      <form onSubmit={creer} className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-border bg-surface p-6 shadow-carte sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">Bienvenue !</h1>
        <p className="-mt-2 text-sm text-muted">Comment s&apos;appelle votre commerce ? Ce nom apparaîtra sur vos factures.</p>
        {erreur && <Alerte>{erreur}</Alerte>}
        <Champ libelle="Nom du commerce" name="nom" placeholder="Ex. Quincaillerie Diallo" required />
        <Bouton type="submit" chargement={chargement}>Commencer</Bouton>
        <button type="button" onClick={() => void deconnecter()} className="text-sm text-muted hover:text-foreground">Se déconnecter</button>
      </form>
    </div>
  );
}

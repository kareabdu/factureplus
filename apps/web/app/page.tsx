"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Icone, type NomIcone } from "@/components/icones";
import { Chargement, LienBouton, Logo } from "@/components/ui";
import { useSession } from "@/lib/espace";

const ATOUTS: { icone: NomIcone; titre: string; texte: string }[] = [
  { icone: "ventes", titre: "Factures en un instant", texte: "Proformas, factures et bons de livraison en PDF, envoyés par WhatsApp." },
  { icone: "produits", titre: "Stock en temps réel", texte: "Entrées, sorties, alertes de stock bas et inventaires." },
  { icone: "achats", titre: "Achats et dépenses", texte: "Réceptions fournisseurs, coûts d'achat et marges toujours à jour." },
];

/**
 * Page d'accueil publique : présentation de FacturePlus et liens légaux (exigés notamment par Google
 * pour l'écran de consentement). Un utilisateur connecté est envoyé vers son tableau de bord.
 */
export default function Accueil() {
  const { session, chargement } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!chargement && session) router.replace("/tableau-de-bord");
  }, [chargement, session, router]);

  if (session) return <Chargement />;

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        <Link href="/connexion" className="text-sm font-medium text-primary hover:underline">Se connecter</Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10">
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Factures, proformas et stock pour les commerçants, sur téléphone et ordinateur.
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          FacturePlus vous aide à vendre, facturer et suivre votre stock simplement : vos documents sont prêts en
          quelques secondes, en FCFA ou dans votre devise, et vos données sont disponibles partout.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LienBouton href="/inscription">Créer un compte</LienBouton>
          <LienBouton href="/connexion" variante="secondaire">Se connecter</LienBouton>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
          {ATOUTS.map((a) => (
            <li key={a.titre} className="rounded-2xl border border-border bg-surface p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icone nom={a.icone} /></span>
              <span className="mt-3 block font-medium">{a.titre}</span>
              <span className="mt-1 block text-sm text-muted">{a.texte}</span>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <span>© FacturePlus — sur ordinateur et téléphone</span>
        <nav className="flex gap-4">
          <Link href="/confidentialite" className="hover:underline">Règles de confidentialité</Link>
          <Link href="/conditions" className="hover:underline">Conditions d&apos;utilisation</Link>
          <Link href="/assistance" className="hover:underline">Assistance</Link>
        </nav>
      </footer>
    </div>
  );
}

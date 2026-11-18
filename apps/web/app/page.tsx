"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Chargement } from "@/components/ui";
import { useSession } from "@/lib/espace";

/** Aiguillage : espace de travail si connecté, sinon connexion. */
export default function Accueil() {
  const { session, chargement } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (chargement) return;
    router.replace(session ? "/tableau-de-bord" : "/connexion");
  }, [chargement, session, router]);

  // Présentation et liens légaux présents dans la page servie (exigence de Google pour l'écran de consentement)
  return (
    <>
      <Chargement />
      <footer className="fixed inset-x-0 bottom-0 p-4 text-center text-xs text-muted">
        <p><strong>FacturePlus</strong> : factures, proformas, bons de livraison et gestion de stock pour les commerçants.</p>
        <p className="mt-1 space-x-3">
          <Link href="/confidentialite" className="hover:underline">Règles de confidentialité</Link>
          <Link href="/assistance" className="hover:underline">Assistance</Link>
        </p>
      </footer>
    </>
  );
}

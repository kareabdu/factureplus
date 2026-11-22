"use client";

import { EquipeProvider, marquerReinitialisation, SessionProvider as Fournisseur, useSession } from "@factureplus/core/react";
import type { ReactNode } from "react";

import { supabase } from "./supabase";

// Lien « Mot de passe oublié » (#…&type=recovery) : repéré dès le chargement, avant que supabase-js
// n'ouvre la session et n'efface l'adresse ; seul l'écran « Nouveau mot de passe » sera alors accessible.
if (typeof window !== "undefined" && /[#&]type=recovery(&|$)/.test(window.location.hash)) marquerReinitialisation();

export { useEquipe, useSession, useDonnees } from "@factureplus/core/react";

export function SessionProvider({ children }: { children: ReactNode }) {
  return <Fournisseur supabase={supabase}>{children}</Fournisseur>;
}

/** Équipe active (entreprise), paramètres et profil de l'utilisateur connecté. */
export function EspaceProvider({ children }: { children: ReactNode }) {
  const { userId } = useSession();
  return <EquipeProvider supabase={supabase} userId={userId}>{children}</EquipeProvider>;
}

"use client";

import { EquipeProvider, SessionProvider as Fournisseur, useSession } from "@stocktracker/core/react";
import type { ReactNode } from "react";

import { supabase } from "./supabase";

export { useEquipe, useSession, useDonnees } from "@stocktracker/core/react";

export function SessionProvider({ children }: { children: ReactNode }) {
  return <Fournisseur supabase={supabase}>{children}</Fournisseur>;
}

/** Équipe active (entreprise), paramètres et profil de l'utilisateur connecté. */
export function EspaceProvider({ children }: { children: ReactNode }) {
  const { userId } = useSession();
  return <EquipeProvider supabase={supabase} userId={userId}>{children}</EquipeProvider>;
}

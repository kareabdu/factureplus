"use client";

import { creerClient, listerClients, modifierClient, supprimerClient } from "@factureplus/core";

import { PageTiers } from "@/components/tiers";
import { supabase } from "@/lib/supabase";

export default function Clients() {
  return (
    <PageTiers titre="Clients" singulier="client" icone="clients"
      lister={(e, r) => listerClients(supabase, e, r)}
      creer={(e, s) => creerClient(supabase, e, s)}
      modifier={(id, s) => modifierClient(supabase, id, s)}
      supprimer={(id) => supprimerClient(supabase, id)} />
  );
}

"use client";

import { creerFournisseur, listerFournisseurs, modifierFournisseur, supprimerFournisseur } from "@stocktracker/core";

import { PageTiers } from "@/components/tiers";
import { supabase } from "@/lib/supabase";

export default function Fournisseurs() {
  return (
    <PageTiers titre="Fournisseurs" singulier="fournisseur" icone="fournisseurs" avecContact
      lister={(e, r) => listerFournisseurs(supabase, e, r)}
      creer={(e, s) => creerFournisseur(supabase, e, s)}
      modifier={(id, s) => modifierFournisseur(supabase, id, s)}
      supprimer={(id) => supprimerFournisseur(supabase, id)} />
  );
}

import {
  chargerFournisseur, creerFournisseur, formaterMontant, LIBELLES_STATUT_ACHAT, listerAchats, modifierFournisseur, supprimerFournisseur,
} from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { FicheContact } from '@/components/fiche-contact';
import { Badge, ChargementPlein, LigneListe, Section } from '@/components/ui';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function FicheFournisseur() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nouveau = id === 'nouveau';
  const { equipeId, parametres } = useEquipe();
  const { donnees } = useDonnees(
    () => (nouveau ? Promise.resolve(null) : Promise.all([chargerFournisseur(supabase, id), listerAchats(supabase, equipeId, id)])),
    [id, equipeId],
  );

  if (!nouveau && !donnees) return <ChargementPlein />;
  const [fournisseur, achats] = donnees ?? [null, []];

  return (
    <>
      <Stack.Screen options={{ title: nouveau ? 'Nouveau fournisseur' : fournisseur?.nom }} />
      <FicheContact
        avecContact
        initial={fournisseur ?? { nom: '' }}
        enregistrer={(s) => (nouveau ? creerFournisseur(supabase, equipeId, s) : modifierFournisseur(supabase, id, s))}
        supprimer={nouveau ? undefined : () => supprimerFournisseur(supabase, id)}>
        {achats.length > 0 && (
          <Section titre="Achats">
            {achats.map((a) => (
              <LigneListe key={a.id} titre={a.numero ?? 'Brouillon'} sousTitre={new Date(`${a.date}T00:00:00`).toLocaleDateString('fr-FR')}
                droite={formaterMontant(a.total, parametres?.symbole_devise)}
                badge={<Badge libelle={LIBELLES_STATUT_ACHAT[a.statut]} ton={a.statut === 'recu' ? 'succes' : 'neutre'} />}
                onPress={() => router.push(a.statut === 'brouillon' ? { pathname: '/achat/editer', params: { id: a.id } } : `/achat/${a.id}`)} />
            ))}
          </Section>
        )}
      </FicheContact>
    </>
  );
}

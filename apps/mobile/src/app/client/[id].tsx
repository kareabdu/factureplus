import {
  chargerClient, creerClient, formaterMontant, listerDocuments, modifierClient, resteAPayer, statutAffiche, supprimerClient,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { FicheContact } from '@/components/fiche-contact';
import { Badge, Bouton, ChargementPlein, Info, LigneListe, Section } from '@/components/ui';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function FicheClient() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nouveau = id === 'nouveau';
  const { equipeId, parametres } = useEquipe();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const { donnees } = useDonnees(
    () => (nouveau ? Promise.resolve(null) : Promise.all([chargerClient(supabase, id), listerDocuments(supabase, equipeId, 'facture', { clientId: id, limite: 50 })])),
    [id, equipeId],
  );

  if (!nouveau && !donnees) return <ChargementPlein />;
  const [client, factures] = donnees ?? [null, []];
  const du = factures.filter((f) => f.statut === 'emis').reduce((s, f) => s + resteAPayer(f), 0);

  return (
    <>
      <Stack.Screen options={{ title: nouveau ? 'Nouveau client' : client?.nom }} />
      <FicheContact
        initial={client ?? { nom: '' }}
        enregistrer={(s) => (nouveau ? creerClient(supabase, equipeId, s) : modifierClient(supabase, id, s))}
        supprimer={nouveau ? undefined : () => supprimerClient(supabase, id)}>
        {!nouveau && (
          <Section titre="Factures">
            {du > 0 && <Info libelle="Reste à encaisser" valeur={m(du)} fort />}
            <Bouton titre="Nouvelle facture pour ce client" icone="ventes" variante="secondaire"
              onPress={() => router.push({ pathname: '/document/editer', params: { type: 'facture', client_id: id } })} />
            {factures.map((f) => {
              const s = statutAffiche(f);
              return (
                <LigneListe key={f.id} titre={f.numero ?? 'Brouillon'} sousTitre={new Date(`${f.date}T00:00:00`).toLocaleDateString('fr-FR')}
                  droite={m(f.total)} badge={<Badge libelle={s.libelle} ton={s.ton} />}
                  onPress={() => router.push(f.statut === 'brouillon' ? { pathname: '/document/editer', params: { id: f.id } } : `/document/${f.id}`)} />
              );
            })}
          </Section>
        )}
      </FicheContact>
    </>
  );
}

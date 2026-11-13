import { listerClients } from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useState } from 'react';

import { Bouton, Ecran, ErreurChargement, LigneListe, Recherche, Vide } from '@/components/ui';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Clients() {
  const { equipeId } = useEquipe();
  const [recherche, setRecherche] = useState('');
  const r = useDeferredValue(recherche);
  const { donnees, chargement, erreur, recharger } = useDonnees(() => listerClients(supabase, equipeId, r), [equipeId, r]);
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  return (
    <Ecran enTete rafraichir={recharger}>
      <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom ou téléphone…" />
      <Bouton titre="Nouveau client" icone="ajouter" onPress={() => router.push('/client/nouveau')} />
      {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
      {!chargement && donnees?.length === 0 && <Vide icone="client" titre={recherche ? 'Aucun client trouvé' : 'Aucun client'} />}
      {donnees?.map((c) => (
        <LigneListe key={c.id} icone="client" titre={c.nom} sousTitre={c.telephone ?? c.adresse} onPress={() => router.push(`/client/${c.id}`)} />
      ))}
    </Ecran>
  );
}

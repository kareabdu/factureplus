import { listerFournisseurs } from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useState } from 'react';

import { Bouton, Ecran, ErreurChargement, LigneListe, Recherche, Vide } from '@/components/ui';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Fournisseurs() {
  const { equipeId } = useEquipe();
  const [recherche, setRecherche] = useState('');
  const r = useDeferredValue(recherche);
  const { donnees, chargement, erreur, recharger } = useDonnees(() => listerFournisseurs(supabase, equipeId, r), [equipeId, r]);
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  return (
    <Ecran enTete rafraichir={recharger}>
      <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom ou téléphone…" />
      <Bouton titre="Nouveau fournisseur" icone="ajouter" onPress={() => router.push('/fournisseur/nouveau')} />
      {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
      {!chargement && donnees?.length === 0 && <Vide icone="fournisseur" titre={recherche ? 'Aucun fournisseur trouvé' : 'Aucun fournisseur'} />}
      {donnees?.map((f) => (
        <LigneListe key={f.id} icone="fournisseur" titre={f.nom} sousTitre={f.telephone ?? f.contact} onPress={() => router.push(`/fournisseur/${f.id}`)} />
      ))}
    </Ecran>
  );
}

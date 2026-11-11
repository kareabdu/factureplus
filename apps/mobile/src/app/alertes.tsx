import { formaterQuantite, listerAlertes } from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Badge, Bouton, Ecran, ErreurChargement, LigneListe, Vide } from '@/components/ui';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Alertes() {
  const { equipeId } = useEquipe();
  const { donnees, chargement, erreur, recharger } = useDonnees(() => listerAlertes(supabase, equipeId), [equipeId]);
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  return (
    <Ecran enTete rafraichir={recharger}>
      {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
      {!chargement && donnees?.length === 0 && (
        <Vide icone="valider" titre="Aucune alerte" texte="Tous vos produits sont au-dessus de leur seuil d'alerte." />
      )}
      {donnees?.map((a) => (
        <LigneListe key={a.id} titre={a.produits?.nom ?? 'Produit'}
          sousTitre={`Seuil : ${formaterQuantite(a.seuil)} · depuis le ${new Date(a.created_at).toLocaleDateString('fr-FR')}`}
          droite={`${formaterQuantite(a.quantite)} ${a.produits?.unite ?? ''}`}
          badge={a.quantite === 0 ? <Badge libelle="Rupture" ton="danger" /> : <Badge libelle="Stock bas" ton="attention" />}
          onPress={() => router.push(`/produit/${a.produit_id}`)} />
      ))}
      {(donnees?.length ?? 0) > 0 && <Bouton titre="Commander (nouvel achat)" icone="achats" onPress={() => router.push('/achat/editer')} />}
    </Ecran>
  );
}

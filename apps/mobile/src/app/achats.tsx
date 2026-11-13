import { formaterMontant, LIBELLES_STATUT_ACHAT, listerAchats } from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Badge, Bouton, Ecran, ErreurChargement, LigneListe, Vide } from '@/components/ui';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Achats() {
  const { equipeId, parametres } = useEquipe();
  const { donnees, chargement, erreur, recharger } = useDonnees(() => listerAchats(supabase, equipeId), [equipeId]);
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  return (
    <Ecran enTete rafraichir={recharger}>
      <Bouton titre="Nouvel achat" icone="ajouter" onPress={() => router.push('/achat/editer')} />
      {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
      {!chargement && donnees?.length === 0 && (
        <Vide icone="achats" titre="Aucun achat" texte="Enregistrez vos réceptions fournisseurs : le stock et les coûts d'achat se mettent à jour." />
      )}
      {donnees?.map((a) => (
        <LigneListe key={a.id} titre={a.fournisseur_nom || 'Fournisseur non renseigné'}
          sousTitre={`${a.numero ?? 'Brouillon'} · ${new Date(`${a.date}T00:00:00`).toLocaleDateString('fr-FR')}`}
          droite={formaterMontant(a.total, parametres?.symbole_devise)}
          badge={<Badge libelle={LIBELLES_STATUT_ACHAT[a.statut]} ton={a.statut === 'recu' ? 'succes' : a.statut === 'annule' ? 'danger' : 'neutre'} />}
          onPress={() => router.push(a.statut === 'brouillon' ? { pathname: '/achat/editer', params: { id: a.id } } : `/achat/${a.id}`)} />
      ))}
    </Ecran>
  );
}

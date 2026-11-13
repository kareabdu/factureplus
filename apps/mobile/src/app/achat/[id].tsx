import { annulerAchat, chargerAchat, formaterMontant, formaterQuantite, LIBELLES_MODE_PAIEMENT, LIBELLES_STATUT_ACHAT } from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Badge, Bouton, Carte, ChargementPlein, Ecran, ErreurChargement, Info, LigneListe, Section } from '@/components/ui';
import { confirmer, signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function VoirAchat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { parametres } = useEquipe();
  const m = (v: number) => formaterMontant(v, parametres?.symbole_devise);
  const { donnees, erreur, recharger } = useDonnees(() => chargerAchat(supabase, id), [id]);
  const [occupe, setOccupe] = useState(false);

  if (erreur && !donnees) return <Ecran enTete><ErreurChargement message={erreur} reessayer={recharger} /></Ecran>;
  if (!donnees) return <ChargementPlein />;
  const { achat: a, lignes } = donnees;

  async function annuler() {
    if (!(await confirmer(`Annuler ${a.numero}`, 'Les quantités reçues seront retirées du stock. Cette action est définitive.', 'Annuler l’achat', true))) return;
    setOccupe(true);
    try {
      await annulerAchat(supabase, a.id);
      vibrerSucces();
      await recharger();
    } catch (e) {
      signalerErreur(e);
    } finally {
      setOccupe(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: a.numero ?? 'Achat' }} />
      <Ecran enTete rafraichir={recharger}>
        <Carte>
          <Info libelle="Fournisseur" valeur={a.fournisseur_nom || '—'} fort />
          <Info libelle="Date" valeur={new Date(`${a.date}T00:00:00`).toLocaleDateString('fr-FR')} />
          {a.reference_fournisseur && <Info libelle="Facture fournisseur" valeur={a.reference_fournisseur} />}
          <Info libelle="Statut" valeur={<Badge libelle={LIBELLES_STATUT_ACHAT[a.statut]} ton={a.statut === 'recu' ? 'succes' : 'danger'} />} />
        </Carte>
        <Carte>
          <Info libelle="Total" valeur={m(a.total)} fort />
          <Info libelle={`Payé (${LIBELLES_MODE_PAIEMENT[a.mode_paiement]})`} valeur={m(a.montant_paye)} />
          {a.total > a.montant_paye && <Info libelle="Reste dû au fournisseur" valeur={m(a.total - a.montant_paye)} fort />}
        </Carte>
        <Section titre="Produits">
          {lignes.map((l) => (
            <LigneListe key={l.produit_id} titre={l.produits?.nom ?? 'Produit'}
              sousTitre={`${formaterQuantite(l.quantite)} ${l.produits?.unite ?? ''} × ${m(l.cout_unitaire)}`}
              droite={m(l.total ?? 0)} onPress={() => router.push(`/produit/${l.produit_id}`)} />
          ))}
        </Section>
        {a.notes && <Carte titre="Notes"><Info libelle="" valeur={a.notes} /></Carte>}
        {a.statut === 'recu' && <Bouton titre="Annuler l'achat" icone="annuler" variante="danger" onPress={annuler} chargement={occupe} />}
      </Ecran>
    </>
  );
}

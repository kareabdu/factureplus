import {
  chargerDocument, enregistrerReglement, formaterMontant, LIBELLES_MODE_PAIEMENT, resteAPayer, type ModePaiement,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Alerte, Bouton, Carte, Champ, ChampMontant, ChargementPlein, Ecran, Info, Pastilles } from '@/components/ui';
import { vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

const MODES: ModePaiement[] = ['especes', 'wave', 'orange_money', 'carte', 'virement', 'cheque', 'autre'];

export default function Reglement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { parametres } = useEquipe();
  const symbole = parametres?.symbole_devise ?? 'FCFA';
  const { donnees } = useDonnees(() => chargerDocument(supabase, id), [id]);
  const [montant, setMontant] = useState<number | null>(null);
  const [mode, setMode] = useState<ModePaiement>('especes');
  const [reference, setReference] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  if (!donnees) return <ChargementPlein />;
  const d = donnees.document;
  const reste = resteAPayer(d);
  const aEncaisser = montant ?? reste;

  async function valider() {
    if (!(aEncaisser > 0)) return setErreur('Montant invalide.');
    if (aEncaisser > reste) return setErreur(`Le montant dépasse le reste à payer (${formaterMontant(reste, symbole)}).`);
    setErreur(null);
    setChargement(true);
    try {
      await enregistrerReglement(supabase, d.id, aEncaisser, mode, undefined, reference.trim() || undefined);
      vibrerSucces();
      router.back();
    } catch (e) {
      setErreur((e as Error).message);
      setChargement(false);
    }
  }

  return (
    <Ecran enTete pied={<Bouton titre={`Encaisser ${formaterMontant(aEncaisser, symbole)}`} onPress={valider} chargement={chargement} />}>
      <Carte>
        <Info libelle={d.numero ?? ''} valeur={d.client_nom} />
        <Info libelle="Reste à payer" valeur={formaterMontant(reste, symbole)} fort />
      </Carte>
      {erreur && <Alerte>{erreur}</Alerte>}
      <ChampMontant libelle="Montant reçu" symbole={symbole} valeur={montant} onChange={setMontant}
        aide="Laissez vide pour encaisser la totalité" />
      <Pastilles libelle="Mode de paiement" options={MODES.map((c) => ({ code: c, libelle: LIBELLES_MODE_PAIEMENT[c] }))} valeur={mode} onChange={setMode} />
      {mode !== 'especes' && <Champ libelle="Référence de transaction" value={reference} onChangeText={setReference} autoCapitalize="characters" />}
    </Ecran>
  );
}

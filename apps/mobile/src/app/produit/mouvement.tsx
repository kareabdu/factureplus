import { chargerProduit, formaterQuantite, mouvementerStock, type TypeMouvement } from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Carte, Champ, ChampQuantite, ChargementPlein, Ecran, Info, Pastilles } from '@/components/ui';
import { vibrerSucces } from '@/lib/confirmer';
import { supabase } from '@/lib/supabase';

const MOTIFS: Record<TypeMouvement, string[]> = {
  entree: ['Réapprovisionnement', 'Retour client', 'Don reçu', 'Autre'],
  sortie: ['Casse', 'Perte', 'Usage interne', 'Échantillon', 'Autre'],
  ajustement: ['Comptage', 'Correction', 'Autre'],
};

/** Mouvement manuel : entrée, sortie ou ajustement (nouvelle quantité). */
export default function Mouvement() {
  const params = useLocalSearchParams<{ id: string; type?: TypeMouvement }>();
  const [type, setType] = useState<TypeMouvement>(params.type ?? 'entree');
  const [quantite, setQuantite] = useState<number | null>(null);
  const [motif, setMotif] = useState(MOTIFS[params.type ?? 'entree'][0]);
  const [reference, setReference] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const { donnees: p } = useDonnees(() => chargerProduit(supabase, params.id), [params.id]);

  if (!p) return <ChargementPlein />;

  const apres = quantite == null ? null
    : type === 'entree' ? p.quantite + quantite : type === 'sortie' ? p.quantite - quantite : quantite;

  async function valider() {
    if (quantite == null || (type !== 'ajustement' && quantite <= 0)) return setErreur('Saisissez une quantité valide.');
    if (apres != null && apres < 0) return setErreur(`Stock insuffisant : ${formaterQuantite(p!.quantite)} ${p!.unite} disponibles.`);
    setErreur(null);
    setChargement(true);
    try {
      await mouvementerStock(supabase, p!.id, type, quantite, motif, reference.trim() || undefined);
      vibrerSucces();
      router.back();
    } catch (e) {
      setErreur((e as Error).message);
      setChargement(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: p.nom }} />
      <Ecran enTete pied={<Bouton titre="Enregistrer le mouvement" onPress={valider} chargement={chargement} />}>
        <Pastilles options={[{ code: 'entree', libelle: 'Entrée' }, { code: 'sortie', libelle: 'Sortie' }, { code: 'ajustement', libelle: 'Ajustement' }]}
          valeur={type} onChange={(t) => { setType(t); setMotif(MOTIFS[t][0]); }} />
        {erreur && <Alerte>{erreur}</Alerte>}
        <ChampQuantite key={type} libelle={type === 'ajustement' ? 'Quantité réelle en stock' : 'Quantité'} unite={p.unite}
          valeur={quantite} onChange={setQuantite} />
        <Carte>
          <Info libelle="Stock actuel" valeur={`${formaterQuantite(p.quantite)} ${p.unite}`} />
          <Info libelle="Après le mouvement" fort valeur={apres == null ? '—' : `${formaterQuantite(apres)} ${p.unite}`} />
        </Carte>
        <Pastilles libelle="Motif" options={MOTIFS[type].map((m) => ({ code: m, libelle: m }))} valeur={motif} onChange={setMotif} />
        <Champ libelle="Référence (facultatif)" value={reference} onChangeText={setReference} placeholder="N° de bon, de lot…" />
        {type === 'entree' && (
          <ThemedText type="small" themeColor="textSecondary">
            Pour une livraison fournisseur, préférez Plus → Achats : le coût d&apos;achat sera mis à jour.
          </ThemedText>
        )}
      </Ecran>
    </>
  );
}

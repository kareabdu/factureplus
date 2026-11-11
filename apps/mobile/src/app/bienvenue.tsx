import { creerEquipe } from '@stocktracker/core';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Champ, Ecran, Lien, Logo, Pastilles } from '@/components/ui';
import { useEquipe, useSession } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

const DEVISES = [
  { code: 'XOF', libelle: 'FCFA (XOF)', symbole: 'FCFA' },
  { code: 'XAF', libelle: 'FCFA (XAF)', symbole: 'FCFA' },
  { code: 'GNF', libelle: 'Franc guinéen', symbole: 'GNF' },
  { code: 'MAD', libelle: 'Dirham', symbole: 'DH' },
] as const;

/** Première connexion : création de l'entreprise (équipe). */
export default function Bienvenue() {
  const { rafraichir } = useEquipe();
  const { deconnecter } = useSession();
  const [nom, setNom] = useState('');
  const [devise, setDevise] = useState<(typeof DEVISES)[number]['code']>('XOF');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function creer() {
    if (nom.trim().length < 2) return setErreur("Indiquez le nom de votre commerce.");
    setErreur(null);
    setChargement(true);
    try {
      const d = DEVISES.find((x) => x.code === devise)!;
      await creerEquipe(supabase, nom.trim(), d.code, d.symbole);
      await rafraichir();
    } catch (e) {
      setErreur((e as Error).message);
      setChargement(false);
    }
  }

  return (
    <Ecran>
      <Logo />
      <ThemedText type="subtitle">Bienvenue !</ThemedText>
      <ThemedText themeColor="textSecondary">
        Comment s&apos;appelle votre commerce ? Ce nom apparaîtra sur vos factures (modifiable plus tard).
      </ThemedText>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="Nom du commerce" value={nom} onChangeText={setNom} placeholder="Ex. Quincaillerie Diallo" autoCapitalize="words" />
      <Pastilles libelle="Devise" options={DEVISES.map((d) => ({ code: d.code, libelle: d.libelle }))} valeur={devise} onChange={setDevise} />
      <Bouton titre="Commencer" onPress={creer} chargement={chargement} />
      <Lien titre="Se déconnecter" onPress={deconnecter} />
    </Ecran>
  );
}

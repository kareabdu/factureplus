import { creerCategorie, listerCategories, modifierCategorie, supprimerCategorie, type Categorie } from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { useState } from 'react';
import { View } from 'react-native';

import { Bouton, Champ, Ecran, ErreurChargement, LigneListe, Vide } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { confirmer, signalerErreur } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

/** Catégories : ajout ; un appui sur une catégorie la passe en modification (renommer / supprimer). */
export default function Categories() {
  const { equipeId } = useEquipe();
  const [nom, setNom] = useState('');
  const [edition, setEdition] = useState<Categorie | null>(null);
  const [chargement, setChargement] = useState(false);
  const { donnees, erreur, recharger } = useDonnees(() => listerCategories(supabase, equipeId), [equipeId]);

  async function executer(fn: () => Promise<unknown>) {
    setChargement(true);
    try {
      await fn();
      setNom('');
      setEdition(null);
      await recharger();
    } catch (e) {
      signalerErreur(e);
    } finally {
      setChargement(false);
    }
  }

  const valider = () => {
    if (!nom.trim()) return;
    void executer(() => (edition ? modifierCategorie(supabase, edition.id, { nom: nom.trim() }) : creerCategorie(supabase, equipeId, { nom: nom.trim() })));
  };

  async function supprimer() {
    if (!edition) return;
    if (!(await confirmer('Supprimer la catégorie', `Les produits de « ${edition.nom} » resteront, sans catégorie.`, 'Supprimer', true))) return;
    void executer(() => supprimerCategorie(supabase, edition.id));
  }

  return (
    <Ecran enTete rafraichir={recharger}>
      <View style={{ gap: Spacing.two }}>
        <Champ libelle={edition ? `Renommer « ${edition.nom} »` : 'Nouvelle catégorie'} value={nom} onChangeText={setNom}
          placeholder="Ex. Boissons" onSubmitEditing={valider} returnKeyType="done" />
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Bouton titre={edition ? 'Renommer' : 'Ajouter'} icone={edition ? 'modifier' : 'ajouter'} onPress={valider} chargement={chargement} desactive={!nom.trim()} />
          {edition && <Bouton titre="Annuler" variante="secondaire" onPress={() => { setEdition(null); setNom(''); }} />}
        </View>
        {edition && <Bouton titre="Supprimer la catégorie" icone="supprimer" variante="danger" onPress={supprimer} />}
      </View>
      {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
      {donnees?.length === 0 && <Vide icone="categorie" titre="Aucune catégorie" texte="Classez vos produits pour les retrouver plus vite." />}
      {donnees?.map((c) => (
        <LigneListe key={c.id} icone="categorie" titre={c.nom} sousTitre={edition?.id === c.id ? 'En modification' : undefined}
          onPress={() => { setEdition(c); setNom(c.nom); }} />
      ))}
    </Ecran>
  );
}

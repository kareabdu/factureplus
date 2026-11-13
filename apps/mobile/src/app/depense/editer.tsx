import {
  CATEGORIES_DEPENSE, chargerDepense, creerDepense, envoyerRecu, lienRecu, modifierDepense, MOYENS_DEPENSE, supprimerDepense,
  type Depense, type SaisieDepense,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ChampDate } from '@/components/champ-date';
import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, BoutonIcone, Champ, ChampMontant, ChargementPlein, Ecran, Pastilles } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmer, signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { versIso } from '@/lib/dates';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

/** Création (sans id) ou modification d'une dépense, avec photo du reçu facultative. */
export default function EditerDepense() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existante = useDonnees(
    () => (id ? Promise.all([chargerDepense(supabase, id)]).then(async ([d]) => ({
      depense: d,
      lien: d.recu_chemin ? await lienRecu(supabase, d.recu_chemin).catch(() => null) : null,
    })) : Promise.resolve(null)),
    [id],
  );
  if (id && !existante.donnees) return <ChargementPlein />;
  return <Formulaire id={id} depense={existante.donnees?.depense ?? null} lienRecu={existante.donnees?.lien ?? null} />;
}

function Formulaire({ id, depense: d, lienRecu: lienInitial }: { id?: string; depense: Depense | null; lienRecu: string | null }) {
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const [s, setS] = useState<SaisieDepense>(() => (d ? {
    commercant: d.commercant, montant: d.montant, date_depense: d.date_depense, categorie: d.categorie,
    moyen_paiement: d.moyen_paiement, description: d.description, recu_chemin: d.recu_chemin,
  } : {
    commercant: '', montant: 0, date_depense: versIso(new Date()), categorie: 'autre', moyen_paiement: 'especes',
    description: null, recu_chemin: null,
  }));
  const [photo, setPhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [recuRetire, setRecuRetire] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const maj = (champs: Partial<SaisieDepense>) => setS((v) => ({ ...v, ...champs }));

  async function choisirPhoto(camera: boolean) {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.6 };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return signalerErreur('Autorisez la caméra dans les réglages du téléphone.', 'Caméra refusée');
    }
    const r = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!r.canceled && r.assets[0]) {
      setPhoto({ uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? 'image/jpeg' });
      setRecuRetire(false);
    }
  }

  async function enregistrer() {
    if (!s.commercant.trim()) return setErreur('Indiquez le bénéficiaire (commerçant, propriétaire, employé…).');
    if (!s.montant || s.montant <= 0) return setErreur('Indiquez un montant.');
    setErreur(null);
    setChargement(true);
    try {
      let recu_chemin = recuRetire ? null : s.recu_chemin;
      if (photo) {
        const contenu = await (await fetch(photo.uri)).arrayBuffer();
        recu_chemin = await envoyerRecu(supabase, equipeId, contenu, photo.mime);
      }
      const saisie: SaisieDepense = { ...s, commercant: s.commercant.trim(), description: s.description?.trim() || null, recu_chemin };
      if (id) await modifierDepense(supabase, id, saisie);
      else await creerDepense(supabase, equipeId, saisie);
      // Ancien reçu remplacé ou retiré : on libère le fichier
      if (d?.recu_chemin && d.recu_chemin !== recu_chemin) await supabase.storage.from('recus').remove([d.recu_chemin]);
      vibrerSucces();
      router.back();
    } catch (e) {
      setErreur((e as Error).message);
      setChargement(false);
    }
  }

  async function supprimer() {
    if (!d || !(await confirmer('Supprimer la dépense', `${d.commercant} sera supprimée définitivement.`, 'Supprimer', true))) return;
    try {
      await supprimerDepense(supabase, d);
      router.back();
    } catch (e) {
      signalerErreur(e);
    }
  }

  const apercu = photo?.uri ?? (recuRetire ? null : lienInitial);

  return (
    <>
      <Stack.Screen options={{
        title: id ? 'Modifier la dépense' : 'Nouvelle dépense',
        headerRight: id ? () => <BoutonIcone icone="supprimer" libelle="Supprimer" couleur={theme.danger} onPress={supprimer} /> : undefined,
      }} />
      <Ecran enTete pied={<Bouton titre="Enregistrer" onPress={enregistrer} chargement={chargement} />}>
        {erreur && <Alerte>{erreur}</Alerte>}

        <ChampMontant libelle="Montant *" symbole={parametres?.symbole_devise ?? 'FCFA'} valeur={s.montant || null}
          onChange={(v) => maj({ montant: v ?? 0 })} />
        <Champ libelle="Bénéficiaire *" value={s.commercant} onChangeText={(commercant) => maj({ commercant })}
          placeholder="Ex. Senelec, propriétaire, transporteur" autoCapitalize="sentences" />
        <View style={{ gap: Spacing.one }}>
          <ThemedText type="smallBold">Date</ThemedText>
          <ChampDate libelle="Date de la dépense" valeur={s.date_depense} onChange={(date_depense) => maj({ date_depense })} pleineLargeur />
        </View>
        <Pastilles libelle="Catégorie" options={CATEGORIES_DEPENSE} valeur={s.categorie} onChange={(categorie) => maj({ categorie })} />
        <Pastilles libelle="Payé par" options={MOYENS_DEPENSE} valeur={s.moyen_paiement ?? 'autre'}
          onChange={(moyen_paiement) => maj({ moyen_paiement })} />
        <Champ libelle="Description" value={s.description ?? ''} onChangeText={(description) => maj({ description })} multiline />

        <View style={{ gap: Spacing.two }}>
          <ThemedText type="smallBold">Reçu</ThemedText>
          {apercu ? (
            <View style={{ gap: Spacing.two }}>
              <Pressable onPress={() => choisirPhoto(false)} accessibilityRole="button" accessibilityLabel="Remplacer la photo du reçu">
                <Image source={{ uri: apercu }} style={{ width: '100%', height: 220, borderRadius: Rayons.moyen, backgroundColor: theme.backgroundSelected }}
                  contentFit="contain" />
              </Pressable>
              <Bouton titre="Retirer le reçu" variante="secondaire" icone="supprimer"
                onPress={() => { setPhoto(null); setRecuRetire(true); }} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <View style={{ flex: 1 }}><Bouton titre="Photographier" icone="photo" variante="secondaire" onPress={() => choisirPhoto(true)} /></View>
              <View style={{ flex: 1 }}><Bouton titre="Galerie" variante="secondaire" onPress={() => choisirPhoto(false)} /></View>
            </View>
          )}
          {!apercu && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <Icone nom="recu" taille={16} couleur={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>Facultatif : gardez une trace du justificatif.</ThemedText>
            </View>
          )}
        </View>
      </Ecran>
    </>
  );
}

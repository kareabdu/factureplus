import {
  chargerProduit, creerProduit, envoyerImageProduit, listerCategories, modifierProduit, type Produit, type SaisieProduit,
} from '@stocktracker/core';
import { useDonnees } from '@stocktracker/core/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, BoutonIcone, Champ, ChampMontant, ChampQuantite, ChargementPlein, Ecran, Pastilles } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { scannerCode } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

/** Création (sans id) ou modification d'un produit. Paramètre `code_barres` : pré-rempli après un scan inconnu. */
export default function EditerProduit() {
  const { id, code_barres } = useLocalSearchParams<{ id?: string; code_barres?: string }>();
  const existant = useDonnees(() => (id ? chargerProduit(supabase, id) : Promise.resolve(null)), [id]);
  if (id && !existant.donnees) return <ChargementPlein />;
  return <Formulaire id={id} produit={existant.donnees} codeBarres={code_barres} />;
}

function Formulaire({ id, produit: p, codeBarres }: { id?: string; produit: Produit | null; codeBarres?: string }) {
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const symbole = parametres?.symbole_devise ?? 'FCFA';
  const categories = useDonnees(() => listerCategories(supabase, equipeId), [equipeId]);

  const [s, setS] = useState<SaisieProduit>(() => (p ? {
    nom: p.nom, reference: p.reference, code_barres: p.code_barres, categorie_id: p.categorie_id, description: p.description,
    unite: p.unite, prix_vente: p.prix_vente, prix_achat: p.prix_achat, seuil_alerte: p.seuil_alerte, image_url: p.image_url,
  } : { nom: '', unite: parametres?.unite_defaut ?? 'Pcs', code_barres: codeBarres ?? null }));
  const [stockInitial, setStockInitial] = useState<number | null>(null);
  const [image, setImage] = useState<{ uri: string; mime: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const maj = (champs: Partial<SaisieProduit>) => setS((v) => ({ ...v, ...champs }));

  async function choisirPhoto(camera: boolean) {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.6 };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return signalerErreur('Autorisez la caméra dans les réglages du téléphone.', 'Caméra refusée');
    }
    const r = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!r.canceled && r.assets[0]) setImage({ uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? 'image/jpeg' });
  }

  async function scanner() {
    const code = await scannerCode('Code-barres du produit');
    if (code) maj({ code_barres: code });
  }

  async function enregistrer() {
    if (!s.nom.trim()) return setErreur('Le nom du produit est obligatoire.');
    setErreur(null);
    setChargement(true);
    try {
      let image_url = s.image_url ?? null;
      if (image) {
        const contenu = await (await fetch(image.uri)).arrayBuffer();
        image_url = await envoyerImageProduit(supabase, equipeId, contenu, image.mime);
      }
      const saisie: SaisieProduit = {
        ...s,
        nom: s.nom.trim(),
        reference: s.reference?.trim() || null,
        code_barres: s.code_barres?.trim() || null,
        image_url,
      };
      if (id) {
        await modifierProduit(supabase, id, saisie);
        vibrerSucces();
        router.back();
      } else {
        const nouveau = await creerProduit(supabase, equipeId, saisie, stockInitial ?? 0);
        vibrerSucces();
        router.replace(`/produit/${nouveau}`);
      }
    } catch (e) {
      setErreur((e as Error).message);
      setChargement(false);
    }
  }

  const apercu = image?.uri ?? s.image_url;

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Modifier le produit' : 'Nouveau produit' }} />
      <Ecran enTete pied={<Bouton titre="Enregistrer" onPress={enregistrer} chargement={chargement} />}>
        {erreur && <Alerte>{erreur}</Alerte>}

        <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'center' }}>
          <Pressable onPress={() => choisirPhoto(false)} accessibilityRole="button" accessibilityLabel="Choisir une photo"
            style={{ width: 88, height: 88, borderRadius: Rayons.moyen, backgroundColor: theme.primarySoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {apercu ? <Image source={{ uri: apercu }} style={{ width: 88, height: 88 }} contentFit="cover" /> : <Icone nom="photo" taille={28} couleur={theme.primary} />}
          </Pressable>
          <View style={{ flex: 1, gap: Spacing.two }}>
            <Bouton titre="Prendre une photo" icone="photo" variante="secondaire" onPress={() => choisirPhoto(true)} />
            <Bouton titre="Galerie" variante="secondaire" onPress={() => choisirPhoto(false)} />
          </View>
        </View>

        <Champ libelle="Nom *" value={s.nom} onChangeText={(nom) => maj({ nom })} placeholder="Ex. Riz parfumé 25 kg" autoCapitalize="sentences" />
        <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Champ libelle="Code-barres" value={s.code_barres ?? ''} onChangeText={(code_barres) => maj({ code_barres })} keyboardType="number-pad" />
          </View>
          <View style={{ paddingBottom: 5 }}><BoutonIcone icone="scanner" libelle="Scanner le code-barres" onPress={scanner} /></View>
        </View>
        <Champ libelle="Référence" value={s.reference ?? ''} onChangeText={(reference) => maj({ reference })} autoCapitalize="characters"
          aide={!id && parametres?.ref_produit_auto ? 'Laissez vide pour une référence automatique' : undefined} />

        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <View style={{ flex: 1 }}><ChampMontant libelle="Prix de vente" symbole={symbole} valeur={s.prix_vente ?? null} onChange={(v) => maj({ prix_vente: v ?? 0 })} /></View>
          <View style={{ flex: 1 }}><ChampMontant libelle="Prix d'achat" symbole={symbole} valeur={s.prix_achat ?? null} onChange={(v) => maj({ prix_achat: v ?? 0 })} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <View style={{ flex: 1 }}><Champ libelle="Unité" value={s.unite} onChangeText={(unite) => maj({ unite })} placeholder="Pcs, kg, L…" /></View>
          <View style={{ flex: 1 }}><ChampQuantite libelle="Seuil d'alerte" valeur={s.seuil_alerte ?? null} onChange={(v) => maj({ seuil_alerte: v ?? 0 })} /></View>
        </View>
        {!id && <ChampQuantite libelle="Stock initial" unite={s.unite} valeur={stockInitial} onChange={setStockInitial} aide="Quantité déjà en stock aujourd'hui" />}

        {(categories.donnees?.length ?? 0) > 0 ? (
          <Pastilles libelle="Catégorie"
            options={[{ code: '', libelle: 'Aucune' }, ...(categories.donnees ?? []).map((c) => ({ code: c.id, libelle: c.nom }))]}
            valeur={s.categorie_id ?? ''} onChange={(v) => maj({ categorie_id: v || null })} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">Astuce : créez des catégories dans Plus → Catégories pour classer vos produits.</ThemedText>
        )}
        <Champ libelle="Description" value={s.description ?? ''} onChangeText={(description) => maj({ description })} multiline />
      </Ecran>
    </>
  );
}

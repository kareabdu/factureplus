import {
  envoyerImageProduit, formaterNumero, modifierParametres, TYPES_TAXE, type ModeleDocument, type ParametresModifiables, type TypeTaxe,
} from '@factureplus/core';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ChoixModele } from '@/components/choix-modele';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Champ, ChargementPlein, Ecran, Interrupteur, Pastilles, Section } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

/** Paramètres de l'entreprise : en-tête des factures, numérotation, taxe. */
export default function Parametres() {
  const { equipeId, parametres, rafraichir } = useEquipe();
  const [s, setS] = useState<ParametresModifiables>(() => ({ ...parametres }));
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  if (!parametres) return <ChargementPlein />;
  const maj = (c: ParametresModifiables) => setS((v) => ({ ...v, ...c }));
  const texte = (cle: keyof ParametresModifiables) => (s[cle] as string | null | undefined) ?? '';

  async function logo() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7 });
    if (r.canceled || !r.assets[0]) return;
    try {
      const contenu = await (await fetch(r.assets[0].uri)).arrayBuffer();
      maj({ logo_url: await envoyerImageProduit(supabase, equipeId, contenu, r.assets[0].mimeType ?? 'image/jpeg') });
    } catch (e) {
      signalerErreur(e);
    }
  }

  async function enregistrer() {
    if (!s.nom_entreprise?.trim()) return setErreur("Le nom de l'entreprise est obligatoire.");
    setErreur(null);
    setChargement(true);
    try {
      const { ...champs } = s;
      delete (champs as Record<string, unknown>).equipe_id;
      delete (champs as Record<string, unknown>).updated_at;
      await modifierParametres(supabase, equipeId, { ...champs, taxe_taux: Number(s.taxe_taux) || 0 });
      await rafraichir();
      vibrerSucces();
      router.back();
    } catch (e) {
      setErreur((e as Error).message);
      setChargement(false);
    }
  }

  const apercuNumero = formaterNumero(s.format_numero ?? '{PREFIX}{YYYY}-{N:04d}', s.prefixe_facture ?? 'FAC-', new Date().getFullYear(), 1);

  return (
    <Ecran enTete pied={<Bouton titre="Enregistrer" onPress={enregistrer} chargement={chargement} />}>
      {erreur && <Alerte>{erreur}</Alerte>}

      <Section titre="Entreprise">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
          {s.logo_url ? <Image source={{ uri: s.logo_url }} style={{ width: 64, height: 64, borderRadius: Rayons.petit }} contentFit="contain" /> : null}
          <Bouton titre={s.logo_url ? 'Changer le logo' : 'Ajouter un logo'} icone="photo" variante="secondaire" onPress={logo} />
        </View>
        <Champ libelle="Nom *" value={texte('nom_entreprise')} onChangeText={(nom_entreprise) => maj({ nom_entreprise })} />
        <Champ libelle="Adresse" value={texte('adresse')} onChangeText={(adresse) => maj({ adresse })} />
        <Champ libelle="Téléphone" value={texte('telephone')} onChangeText={(telephone) => maj({ telephone })} keyboardType="phone-pad" />
        <Champ libelle="Téléphone 2" value={texte('telephone2')} onChangeText={(telephone2) => maj({ telephone2 })} keyboardType="phone-pad" />
        <Champ libelle="E-mail" value={texte('email')} onChangeText={(email) => maj({ email })} keyboardType="email-address" autoCapitalize="none" />
        <Champ libelle="NINEA" value={texte('ninea')} onChangeText={(ninea) => maj({ ninea })} autoCapitalize="characters" />
        <Champ libelle="RCCM" value={texte('rccm')} onChangeText={(rccm) => maj({ rccm })} autoCapitalize="characters" />
      </Section>

      <Section titre="Numérotation">
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <View style={{ flex: 1 }}><Champ libelle="Factures" value={texte('prefixe_facture')} onChangeText={(prefixe_facture) => maj({ prefixe_facture })} autoCapitalize="characters" /></View>
          <View style={{ flex: 1 }}><Champ libelle="Proformas" value={texte('prefixe_proforma')} onChangeText={(prefixe_proforma) => maj({ prefixe_proforma })} autoCapitalize="characters" /></View>
          <View style={{ flex: 1 }}><Champ libelle="Livraisons" value={texte('prefixe_bl')} onChangeText={(prefixe_bl) => maj({ prefixe_bl })} autoCapitalize="characters" /></View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">Exemple de numéro : {apercuNumero}</ThemedText>
        <Interrupteur libelle="Référence produit automatique" aide={`Préfixe : ${s.prefixe_ref_produit ?? 'P-'}`}
          valeur={!!s.ref_produit_auto} onChange={(ref_produit_auto) => maj({ ref_produit_auto })} />
        <Champ libelle="Unité par défaut" value={texte('unite_defaut')} onChangeText={(unite_defaut) => maj({ unite_defaut })} />
      </Section>

      <Section titre="Taxe">
        <Pastilles options={TYPES_TAXE.map((t) => ({ code: t.valeur, libelle: t.libelle }))} valeur={(s.taxe_type ?? 'aucune') as TypeTaxe}
          onChange={(taxe_type) => maj({ taxe_type })} />
        {s.taxe_type !== 'aucune' && (
          <>
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <View style={{ flex: 1 }}><Champ libelle="Nom" value={texte('taxe_nom')} onChangeText={(taxe_nom) => maj({ taxe_nom })} /></View>
              <View style={{ flex: 1 }}>
                <Champ libelle="Taux (%)" value={String(s.taxe_taux ?? '')} keyboardType="decimal-pad"
                  onChangeText={(t) => maj({ taxe_taux: Number(t.replace(',', '.')) || 0 })} />
              </View>
            </View>
            {s.taxe_type !== 'deduction' && (
              <Interrupteur libelle="Prix TTC (taxe incluse)" aide="Les prix des produits contiennent déjà la taxe"
                valeur={!!s.taxe_incluse} onChange={(taxe_incluse) => maj({ taxe_incluse })} />
            )}
          </>
        )}
      </Section>

      <Section titre="Modèle de facture">
        <ChoixModele modele={(s.modele_document ?? 'classique') as ModeleDocument} couleur={s.couleur_document ?? '#147A2E'}
          parametres={{ ...parametres, ...s } as typeof parametres} onChange={maj} />
      </Section>

      <Section titre="Factures">
        <Champ libelle="Conditions par défaut" value={texte('conditions_defaut')} onChangeText={(conditions_defaut) => maj({ conditions_defaut })} multiline
          placeholder="Ex. Paiement à 30 jours" />
        <Champ libelle="Pied de page" value={texte('pied_facture')} onChangeText={(pied_facture) => maj({ pied_facture })} multiline
          placeholder="Ex. Merci pour votre confiance" />
      </Section>
    </Ecran>
  );
}

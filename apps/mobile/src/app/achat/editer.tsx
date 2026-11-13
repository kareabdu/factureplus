import {
  chargerAchat, enregistrerAchat, formaterMontant, formaterQuantite, LIBELLES_MODE_PAIEMENT, lireMontant, lireQuantite,
  receptionnerAchat, supprimerAchatBrouillon, type EnteteAchat, type LigneAchat, type ModePaiement,
} from '@factureplus/core';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, BoutonIcone, Carte, Champ, ChampMontant, ChargementPlein, Ecran, Info, LigneListe, Pastilles, Section } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmer, signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { choisirFournisseur, choisirProduit } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

type Ligne = LigneAchat & { nom: string; unite: string };
const MODES: ModePaiement[] = ['especes', 'wave', 'orange_money', 'virement', 'cheque', 'credit'];

/** Achat fournisseur en brouillon, puis réception (entrée en stock). */
export default function EditerAchat() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const symbole = parametres?.symbole_devise ?? 'FCFA';
  const [id, setId] = useState<string | null>(params.id ?? null);
  const [entete, setEntete] = useState<EnteteAchat>({ fournisseur_nom: '', mode_paiement: 'especes', date: new Date().toISOString().slice(0, 10) });
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [paye, setPaye] = useState<number | null>(null);
  const [pret, setPret] = useState(!params.id);
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    let actif = true;
    chargerAchat(supabase, params.id).then(({ achat: a, lignes: l }) => {
      if (!actif) return;
      if (a.statut !== 'brouillon') return router.replace(`/achat/${a.id}`);
      setEntete({ fournisseur_id: a.fournisseur_id, fournisseur_nom: a.fournisseur_nom, date: a.date, mode_paiement: a.mode_paiement,
        reference_fournisseur: a.reference_fournisseur, notes: a.notes });
      setPaye(a.montant_paye || null);
      setLignes(l.map((x) => ({ ...x, nom: x.produits?.nom ?? '', unite: x.produits?.unite ?? '' })));
      setPret(true);
    }).catch((e: Error) => actif && setErreur(e.message));
    return () => { actif = false; };
  }, [params.id]);

  const total = lignes.reduce((s, l) => s + Math.round(l.quantite * l.cout_unitaire), 0);
  const montantPaye = entete.mode_paiement === 'credit' ? (paye ?? 0) : (paye ?? total);

  async function ajouter() {
    const p = await choisirProduit();
    if (!p) return;
    setLignes((ls) => ls.some((l) => l.produit_id === p.id) ? ls
      : [...ls, { produit_id: p.id, nom: p.nom, unite: p.unite, quantite: 1, cout_unitaire: p.prix_achat }]);
  }

  async function fournisseur() {
    const f = await choisirFournisseur();
    if (f) setEntete((e) => ({ ...e, fournisseur_id: f.id, fournisseur_nom: f.nom }));
  }

  async function enregistrer(receptionner: boolean) {
    if (receptionner && !lignes.length) return setErreur('Ajoutez au moins un produit.');
    if (lignes.some((l) => !(l.quantite > 0))) return setErreur('Chaque ligne doit avoir une quantité.');
    if (montantPaye > total) return setErreur('Le montant payé dépasse le total.');
    setErreur(null);
    setAction(receptionner ? 'recevoir' : 'brouillon');
    try {
      const nouvelId = await enregistrerAchat(supabase, equipeId, id, { ...entete, montant_paye: montantPaye }, lignes);
      setId(nouvelId);
      if (receptionner) {
        if (!(await confirmer('Réceptionner l’achat', 'Les quantités seront ajoutées au stock et les coûts d’achat mis à jour.', 'Réceptionner'))) {
          setAction(null);
          return;
        }
        await receptionnerAchat(supabase, nouvelId);
        vibrerSucces();
        router.replace(`/achat/${nouvelId}`);
      } else {
        router.back();
      }
    } catch (e) {
      setErreur((e as Error).message);
      setAction(null);
    }
  }

  async function supprimer() {
    if (!id || !(await confirmer('Supprimer le brouillon', 'Ce brouillon d’achat sera supprimé.', 'Supprimer', true))) return;
    try {
      await supprimerAchatBrouillon(supabase, id);
      router.back();
    } catch (e) {
      signalerErreur(e);
    }
  }

  if (!pret) return erreur ? <Ecran enTete><Alerte>{erreur}</Alerte></Ecran> : <ChargementPlein />;

  return (
    <>
      <Stack.Screen options={{
        title: id ? 'Achat (brouillon)' : 'Nouvel achat',
        headerRight: id ? () => <BoutonIcone icone="supprimer" libelle="Supprimer" couleur={theme.danger} onPress={supprimer} /> : undefined,
      }} />
      <Ecran enTete pied={
        <>
          <Bouton titre="Brouillon" variante="secondaire" onPress={() => enregistrer(false)} chargement={action === 'brouillon'} desactive={!!action} />
          <Bouton titre="Réceptionner" icone="valider" onPress={() => enregistrer(true)} chargement={action === 'recevoir'} desactive={!!action} style={{ flexGrow: 2 }} />
        </>
      }>
        {erreur && <Alerte>{erreur}</Alerte>}
        <Section titre="Fournisseur">
          {entete.fournisseur_id
            ? <LigneListe icone="fournisseur" titre={entete.fournisseur_nom ?? ''} onPress={fournisseur} />
            : <Bouton titre="Choisir un fournisseur" icone="fournisseur" variante="secondaire" onPress={fournisseur} />}
          <Champ libelle="N° de facture fournisseur (facultatif)" value={entete.reference_fournisseur ?? ''}
            onChangeText={(reference_fournisseur) => setEntete((e) => ({ ...e, reference_fournisseur }))} />
        </Section>

        <Section titre={`Produits reçus (${lignes.length})`}>
          {lignes.map((l, i) => (
            <View key={l.produit_id} style={[styles.ligne, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedText type="smallBold" style={{ flex: 1 }} numberOfLines={1}>{l.nom}</ThemedText>
                <BoutonIcone icone="supprimer" libelle="Retirer" couleur={theme.danger} onPress={() => setLignes((ls) => ls.filter((_, j) => j !== i))} />
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                <TextInput defaultValue={formaterQuantite(l.quantite)} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel="Quantité"
                  onChangeText={(t) => { const q = lireQuantite(t); if (q) setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, quantite: q } : x))); }}
                  style={[styles.saisie, { width: 80, color: theme.text, borderColor: theme.border }]} />
                <ThemedText type="small" themeColor="textSecondary">{l.unite} × coût</ThemedText>
                <TextInput defaultValue={formaterMontant(l.cout_unitaire, null)} keyboardType="number-pad" selectTextOnFocus accessibilityLabel="Coût unitaire"
                  onChangeText={(t) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, cout_unitaire: lireMontant(t) ?? 0 } : x)))}
                  style={[styles.saisie, { flex: 1, textAlign: 'right', color: theme.text, borderColor: theme.border }]} />
              </View>
              <ThemedText type="smallBold" style={{ alignSelf: 'flex-end' }}>{formaterMontant(Math.round(l.quantite * l.cout_unitaire), symbole)}</ThemedText>
            </View>
          ))}
          <Bouton titre="Ajouter un produit" icone="ajouter" variante="secondaire" onPress={ajouter} />
        </Section>

        <Carte><Info libelle="Total" valeur={formaterMontant(total, symbole)} fort /></Carte>

        <Pastilles libelle="Paiement" options={MODES.map((c) => ({ code: c, libelle: LIBELLES_MODE_PAIEMENT[c] }))}
          valeur={entete.mode_paiement ?? 'especes'} onChange={(mode_paiement) => setEntete((e) => ({ ...e, mode_paiement }))} />
        <ChampMontant libelle="Montant payé" symbole={symbole} valeur={paye} onChange={setPaye}
          aide={entete.mode_paiement === 'credit' ? 'Acompte versé (laissez vide si rien n’est payé)' : 'Laissez vide si tout est payé'} />
        <Champ libelle="Date" value={entete.date ?? ''} onChangeText={(date) => setEntete((e) => ({ ...e, date }))} placeholder="AAAA-MM-JJ" />
        <Champ libelle="Notes" value={entete.notes ?? ''} onChangeText={(notes) => setEntete((e) => ({ ...e, notes }))} multiline />
      </Ecran>
    </>
  );
}

const styles = StyleSheet.create({
  ligne: { borderWidth: 1, borderRadius: Rayons.moyen, padding: Spacing.three, gap: Spacing.two },
  saisie: { height: 42, borderWidth: 1, borderRadius: Rayons.petit, paddingHorizontal: Spacing.two, fontSize: 16 },
});

import {
  calculerTotaux, chargerClient, chargerDocument, enregistrerDocument, formaterMontant, formaterQuantite, LIBELLES_TYPE_DOCUMENT,
  ligneDepuisProduit, lireMontant, lireQuantite, supprimerBrouillon, totalLigne, validerDocument,
  type EnteteDocument, type LigneDocument, type TypeDocument,
} from '@stocktracker/core';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, BoutonIcone, Carte, Champ, ChargementPlein, Ecran, Info, LigneListe, Section } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmer, signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { choisirClient, choisirProduit } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

type Ligne = LigneDocument & { cle: string; stock?: number };
let compteur = 0;
const cle = () => `l${++compteur}`;

/** Éditeur de brouillon (facture ou proforma) : client, lignes, aperçu des totaux, validation. */
export default function EditerDocument() {
  const params = useLocalSearchParams<{ id?: string; type?: TypeDocument; client_id?: string }>();
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const symbole = parametres?.symbole_devise ?? 'FCFA';
  const [id, setId] = useState<string | null>(params.id ?? null);
  const [type, setType] = useState<TypeDocument>(params.type ?? 'facture');
  const [entete, setEntete] = useState<EnteteDocument>({ client_nom: '', date: new Date().toISOString().slice(0, 10) });
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [pret, setPret] = useState(!params.id);
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState<'brouillon' | 'valider' | null>(null);

  // Nouvelle facture depuis la fiche d'un client : client pré-rempli
  useEffect(() => {
    if (params.id || !params.client_id) return;
    let actif = true;
    chargerClient(supabase, params.client_id).then((c) => {
      if (actif) setEntete((e) => ({ ...e, client_id: c.id, client_nom: c.nom, client_telephone: c.telephone, client_adresse: c.adresse }));
    }).catch(() => { /* client introuvable : saisie libre */ });
    return () => { actif = false; };
  }, [params.id, params.client_id]);

  useEffect(() => {
    if (!params.id) return;
    let actif = true;
    chargerDocument(supabase, params.id).then(({ document: d, lignes: l }) => {
      if (!actif) return;
      if (d.statut !== 'brouillon') {
        router.replace(`/document/${d.id}`);
        return;
      }
      setType(d.type);
      setEntete({ client_id: d.client_id, client_nom: d.client_nom, client_telephone: d.client_telephone, client_adresse: d.client_adresse,
        date: d.date, echeance: d.echeance, conditions: d.conditions, notes: d.notes });
      setLignes(l.map((x) => ({ ...x, cle: cle() })));
      setPret(true);
    }).catch((e: Error) => actif && setErreur(e.message));
    return () => { actif = false; };
  }, [params.id]);

  const totaux = calculerTotaux(lignes, {
    taxe_type: parametres?.taxe_type ?? 'aucune', taxe_nom: parametres?.taxe_nom ?? 'TVA',
    taxe_taux: parametres?.taxe_taux ?? 0, taxe_incluse: parametres?.taxe_incluse ?? false,
  });

  async function ajouterProduit() {
    const p = await choisirProduit();
    if (!p) return;
    setLignes((ls) => {
      // Même produit déjà présent : on augmente la quantité
      const i = ls.findIndex((l) => l.produit_id === p.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantite: l.quantite + 1 } : l));
      return [...ls, { ...ligneDepuisProduit(p), cle: cle(), stock: p.quantite }];
    });
  }

  const ajouterLibre = () => setLignes((ls) => [...ls, { cle: cle(), produit_id: null, designation: '', prix_unitaire: 0, quantite: 1, taxable: true }]);
  const majLigne = (k: string, champs: Partial<Ligne>) => setLignes((ls) => ls.map((l) => (l.cle === k ? { ...l, ...champs } : l)));
  const retirerLigne = (k: string) => setLignes((ls) => ls.filter((l) => l.cle !== k));

  async function client() {
    const c = await choisirClient();
    if (c) setEntete((e) => ({ ...e, client_id: c.id, client_nom: c.nom, client_telephone: c.telephone, client_adresse: c.adresse }));
  }

  async function enregistrer(valider: boolean) {
    const invalides = lignes.filter((l) => !l.designation.trim() || !(l.quantite > 0));
    if (invalides.length) return setErreur('Chaque ligne doit avoir une désignation et une quantité.');
    if (valider && !lignes.length) return setErreur('Ajoutez au moins une ligne.');
    if (valider && !entete.client_nom?.trim()) return setErreur('Indiquez le client.');
    setErreur(null);
    setAction(valider ? 'valider' : 'brouillon');
    try {
      const nouvelId = await enregistrerDocument(supabase, equipeId, type, id, entete, lignes);
      setId(nouvelId);
      if (valider) {
        if (!(await confirmer(`Valider la ${LIBELLES_TYPE_DOCUMENT[type].toLowerCase()}`,
          type === 'facture' ? 'Un numéro sera attribué et le stock sera déduit. Une facture validée ne se modifie plus.' : 'Un numéro sera attribué.',
          'Valider'))) {
          setAction(null);
          return;
        }
        await validerDocument(supabase, nouvelId);
        vibrerSucces();
        router.replace(`/document/${nouvelId}`);
      } else {
        vibrerSucces();
        router.back();
      }
    } catch (e) {
      setErreur((e as Error).message);
      setAction(null);
    }
  }

  async function supprimer() {
    if (!id || !(await confirmer('Supprimer le brouillon', 'Ce brouillon sera définitivement supprimé.', 'Supprimer', true))) return;
    try {
      await supprimerBrouillon(supabase, id);
      router.back();
    } catch (e) {
      signalerErreur(e);
    }
  }

  if (!pret) return erreur ? <Ecran enTete><Alerte>{erreur}</Alerte></Ecran> : <ChargementPlein />;
  const libelle = LIBELLES_TYPE_DOCUMENT[type];

  return (
    <>
      <Stack.Screen options={{
        title: id ? `${libelle} (brouillon)` : `Nouvelle ${libelle.toLowerCase()}`,
        headerRight: id ? () => <BoutonIcone icone="supprimer" libelle="Supprimer le brouillon" couleur={theme.danger} onPress={supprimer} /> : undefined,
      }} />
      <Ecran enTete pied={
        <>
          <Bouton titre="Brouillon" variante="secondaire" onPress={() => enregistrer(false)} chargement={action === 'brouillon'} desactive={!!action} />
          <Bouton titre="Valider" icone="valider" onPress={() => enregistrer(true)} chargement={action === 'valider'} desactive={!!action} style={{ flexGrow: 2 }} />
        </>
      }>
        {erreur && <Alerte>{erreur}</Alerte>}

        <Section titre="Client">
          {entete.client_id ? (
            <LigneListe icone="client" titre={entete.client_nom ?? ''} sousTitre={entete.client_telephone} onPress={client} />
          ) : (
            <>
              <Champ libelle="Nom du client" value={entete.client_nom ?? ''} onChangeText={(client_nom) => setEntete((e) => ({ ...e, client_nom }))}
                placeholder="Client de passage, ou choisir…" />
              <Bouton titre="Choisir un client enregistré" icone="client" variante="secondaire" onPress={client} />
            </>
          )}
        </Section>

        <Section titre={`Articles (${lignes.length})`}>
          {lignes.map((l) => (
            <LigneEditeur key={l.cle} ligne={l} symbole={symbole} type={type}
              onChange={(c) => majLigne(l.cle, c)} onRetirer={() => retirerLigne(l.cle)} />
          ))}
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Bouton titre="Produit" icone="ajouter" onPress={ajouterProduit} />
            <Bouton titre="Ligne libre" icone="ajouter" variante="secondaire" onPress={ajouterLibre} />
          </View>
        </Section>

        <Carte>
          {totaux.montant_taxe !== 0 && <Info libelle="Sous-total" valeur={formaterMontant(totaux.sous_total, symbole)} />}
          {totaux.montant_taxe !== 0 && (
            <Info libelle={`${parametres?.taxe_nom} ${parametres?.taxe_taux} %${parametres?.taxe_incluse ? ' (incluse)' : ''}`}
              valeur={formaterMontant(totaux.montant_taxe, symbole)} />
          )}
          <Info libelle="Total" valeur={formaterMontant(totaux.total, symbole)} fort />
        </Carte>

        <Section titre="Détails">
          <Champ libelle="Date" value={entete.date ?? ''} onChangeText={(date) => setEntete((e) => ({ ...e, date }))} placeholder="AAAA-MM-JJ" />
          {type === 'facture' && (
            <Champ libelle="Échéance (facultatif)" value={entete.echeance ?? ''} onChangeText={(echeance) => setEntete((e) => ({ ...e, echeance: echeance || null }))}
              placeholder="AAAA-MM-JJ" />
          )}
          <Champ libelle="Notes" value={entete.notes ?? ''} onChangeText={(notes) => setEntete((e) => ({ ...e, notes }))} multiline />
        </Section>
      </Ecran>
    </>
  );
}

function LigneEditeur({ ligne: l, symbole, type, onChange, onRetirer }: {
  ligne: Ligne; symbole: string; type: TypeDocument; onChange: (c: Partial<Ligne>) => void; onRetirer: () => void;
}) {
  const theme = useTheme();
  const [qte, setQte] = useState(formaterQuantite(l.quantite));
  const [prix, setPrix] = useState(formaterMontant(l.prix_unitaire, null));
  const depasse = type === 'facture' && l.stock !== undefined && l.quantite > l.stock;

  const pas = (delta: number) => {
    const q = Math.max(1, Math.round((l.quantite + delta) * 1000) / 1000);
    onChange({ quantite: q });
    setQte(formaterQuantite(q));
  };

  return (
    <View style={[styles.ligne, { backgroundColor: theme.backgroundElement, borderColor: depasse ? theme.warning : theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        {l.produit_id ? (
          <ThemedText type="smallBold" style={{ flex: 1, fontSize: 15 }} numberOfLines={2}>{l.designation}</ThemedText>
        ) : (
          <TextInput value={l.designation} onChangeText={(designation) => onChange({ designation })} placeholder="Désignation (service, frais…)"
            placeholderTextColor={theme.textSecondary} style={[styles.flex, styles.saisie, { color: theme.text, borderColor: theme.border }]} />
        )}
        <BoutonIcone icone="supprimer" libelle="Retirer la ligne" couleur={theme.danger} onPress={onRetirer} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <Pressable onPress={() => pas(-1)} style={[styles.pas, { borderColor: theme.border }]} accessibilityLabel="Diminuer la quantité">
          <ThemedText type="smallBold" style={{ fontSize: 20 }}>−</ThemedText>
        </Pressable>
        <TextInput value={qte} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel="Quantité"
          onChangeText={(t) => { setQte(t); const q = lireQuantite(t); if (q) onChange({ quantite: q }); }}
          style={[styles.saisie, { width: 64, textAlign: 'center', color: theme.text, borderColor: theme.border }]} />
        <Pressable onPress={() => pas(1)} style={[styles.pas, { borderColor: theme.border }]} accessibilityLabel="Augmenter la quantité">
          <ThemedText type="smallBold" style={{ fontSize: 20 }}>+</ThemedText>
        </Pressable>
        <ThemedText type="small" themeColor="textSecondary">×</ThemedText>
        <TextInput value={prix} keyboardType="number-pad" selectTextOnFocus accessibilityLabel="Prix unitaire"
          onChangeText={(t) => { setPrix(t); onChange({ prix_unitaire: lireMontant(t) ?? 0 }); }}
          style={[styles.saisie, styles.flex, { textAlign: 'right', color: theme.text, borderColor: theme.border }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <ThemedText type="small" style={{ color: depasse ? theme.warning : theme.textSecondary }}>
          {l.stock !== undefined ? `Stock : ${formaterQuantite(l.stock)}${depasse ? ' — insuffisant' : ''}` : l.unite ?? ''}
        </ThemedText>
        <ThemedText type="smallBold">{formaterMontant(totalLigne(l), symbole)}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ligne: { borderWidth: 1, borderRadius: Rayons.moyen, padding: Spacing.three, gap: Spacing.two },
  saisie: { height: 42, borderWidth: 1, borderRadius: Rayons.petit, paddingHorizontal: Spacing.two, fontSize: 16 },
  pas: { width: 42, height: 42, borderRadius: Rayons.petit, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

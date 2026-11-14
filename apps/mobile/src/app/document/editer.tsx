import {
  calculerTotaux, chargerClient, CLIENT_DE_PASSAGE, chargerDocument, enregistrerDocument, formaterMontant, formaterQuantite, LIBELLES_TYPE_DOCUMENT,
  statutAffiche, supprimerBrouillon, totalLigne, validerDocument,
  type Document, type EnteteDocument, type ReglageTaxe, type TypeDocument,
} from '@factureplus/core';
import { libelleEnregistrementAuto, useEnregistrementAuto } from '@factureplus/core/react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ChampDate, versIso } from '@/components/champ-date';
import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Badge, Bouton, BoutonIcone, ChargementPlein, Ecran } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmer, signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { choisirClient, editerArticle, type LigneEditee } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

type Ligne = LigneEditee & { cle: number };
let compteur = 0;
const aujourdhui = () => versIso(new Date());
const dansJours = (iso: string, n: number) => {
  const [a, m, j] = iso.split('-').map(Number);
  return versIso(new Date(a, m - 1, j + n));
};

/**
 * Création et modification d'une facture ou d'une proforma, quel que soit le statut.
 * Brouillon : « Brouillon » ou « Valider ». Document validé : « Enregistrer » (numéro conservé,
 * stock rapproché par la base).
 */
export default function EditerDocument() {
  const params = useLocalSearchParams<{ id?: string; type?: TypeDocument; client_id?: string }>();
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const symbole = parametres?.symbole_devise ?? 'FCFA';
  const m = (v: number) => formaterMontant(v, symbole);

  const [id, setId] = useState<string | null>(params.id ?? null);
  const [type, setType] = useState<TypeDocument>(params.type ?? 'facture');
  const [existant, setExistant] = useState<Document | null>(null);
  const [entete, setEntete] = useState<EnteteDocument>(() => {
    const date = aujourdhui();
    return { client_nom: '', date, echeance: (params.type ?? 'facture') === 'facture' ? dansJours(date, 7) : null };
  });
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [pret, setPret] = useState(!params.id);
  const [erreur, setErreur] = useState<string | null>(null);
  const [action, setAction] = useState<'brouillon' | 'valider' | 'enregistrer' | null>(null);
  // Identifiant à jour même entre deux rendus (enregistrement automatique puis action manuelle)
  const idRef = useRef<string | null>(params.id ?? null);

  const brouillon = !existant || existant.statut === 'brouillon';

  // Brouillon enregistré automatiquement après chaque modification (dès qu'il a un article valide)
  const auto = useEnregistrementAuto({
    actif: pret && brouillon && !action && lignes.length > 0 && lignes.every((l) => l.designation.trim() && l.quantite > 0),
    signature: signatureDocument(entete, lignes),
    enregistrer: async () => {
      const nouvelId = await enregistrerDocument(supabase, equipeId, type, idRef.current, entete, lignes);
      idRef.current = nouvelId;
      setId(nouvelId);
    },
  });
  const { marquer: marquerEnregistre } = auto;

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
      setExistant(d);
      setType(d.type);
      setEntete({ client_id: d.client_id, client_nom: d.client_nom, client_telephone: d.client_telephone, client_adresse: d.client_adresse,
        date: d.date, echeance: d.echeance, conditions: d.conditions, notes: d.notes });
      const charge = { client_id: d.client_id, client_nom: d.client_nom, client_telephone: d.client_telephone, client_adresse: d.client_adresse,
        date: d.date, echeance: d.echeance, conditions: d.conditions, notes: d.notes };
      const lignesChargees = l.map((x) => ({
        produit_id: x.produit_id, designation: x.designation, unite: x.unite ?? null, prix_unitaire: x.prix_unitaire,
        quantite: x.quantite, taxable: x.taxable, cle: ++compteur,
      }));
      setLignes(lignesChargees);
      // État chargé = déjà enregistré : pas d'enregistrement automatique sans modification
      marquerEnregistre(signatureDocument(charge, lignesChargees));
      setPret(true);
    }).catch((e: Error) => actif && setErreur(e.message));
    return () => { actif = false; };
  }, [params.id, marquerEnregistre]);

  // Un brouillon suit les paramètres actuels ; un document validé garde sa taxe d'origine
  const taxe: ReglageTaxe = existant && !brouillon
    ? { taxe_type: existant.taxe_type, taxe_nom: existant.taxe_nom, taxe_taux: existant.taxe_taux, taxe_incluse: existant.taxe_incluse }
    : { taxe_type: parametres?.taxe_type ?? 'aucune', taxe_nom: parametres?.taxe_nom ?? 'TVA', taxe_taux: parametres?.taxe_taux ?? 0,
        taxe_incluse: parametres?.taxe_incluse ?? false };
  const totaux = calculerTotaux(lignes, taxe);
  const dejaPaye = existant?.montant_paye ?? 0;
  const libelle = LIBELLES_TYPE_DOCUMENT[type];

  async function article(ligne?: Ligne) {
    const r = await editerArticle(ligne ?? null, type === 'facture');
    if (!r) return;
    if (r.action === 'supprimer') {
      if (ligne) setLignes((ls) => ls.filter((l) => l.cle !== ligne.cle));
      return;
    }
    if (ligne) setLignes((ls) => ls.map((l) => (l.cle === ligne.cle ? { ...r.ligne, cle: l.cle } : l)));
    else setLignes((ls) => [...ls, { ...r.ligne, cle: ++compteur }]);
  }

  async function client() {
    const c = await choisirClient();
    if (c) setEntete((e) => ({ ...e, client_id: c.id, client_nom: c.nom, client_telephone: c.telephone, client_adresse: c.adresse }));
  }

  async function enregistrer(mode: 'brouillon' | 'valider' | 'enregistrer') {
    if (mode !== 'brouillon' && !lignes.length) return setErreur('Ajoutez au moins un article.');
    // Facture sans client : « Client de passage » (même règle que valider_document)
    const sansClient = !entete.client_nom?.trim();
    if (mode !== 'brouillon' && sansClient && type !== 'facture') return setErreur('Indiquez le client.');
    const enteteFinale = mode !== 'brouillon' && sansClient ? { ...entete, client_id: null, client_nom: CLIENT_DE_PASSAGE } : entete;
    if (mode === 'enregistrer' && type === 'facture' && totaux.total < dejaPaye) {
      return setErreur(`Le total ne peut pas être inférieur au montant déjà encaissé (${m(dejaPaye)}).`);
    }
    setErreur(null);
    setAction(mode);
    try {
      await auto.attendre(); // un enregistrement automatique en cours a pu créer le brouillon
      if (enteteFinale !== entete) setEntete(enteteFinale);
      const nouvelId = await enregistrerDocument(supabase, equipeId, type, idRef.current, enteteFinale, lignes);
      idRef.current = nouvelId;
      setId(nouvelId);
      auto.marquer(signatureDocument(enteteFinale, lignes));
      if (mode === 'valider') await validerDocument(supabase, nouvelId);
      vibrerSucces();
      if (mode === 'brouillon') router.back();
      else if (existant && !brouillon) router.back();
      else router.replace(`/document/${nouvelId}`);
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
  const statut = existant && !brouillon ? statutAffiche(existant) : null;

  return (
    <>
      <Stack.Screen options={{
        title: libelle,
        headerRight: id && brouillon ? () => <BoutonIcone icone="supprimer" libelle="Supprimer le brouillon" couleur={theme.danger} onPress={supprimer} /> : undefined,
      }} />
      <Ecran enTete pied={brouillon ? (
        <>
          <Bouton titre="Brouillon" variante="secondaire" onPress={() => enregistrer('brouillon')} chargement={action === 'brouillon'} desactive={!!action} />
          <Bouton titre="Valider" icone="valider" onPress={() => enregistrer('valider')} chargement={action === 'valider'} desactive={!!action} style={{ flexGrow: 2 }} />
        </>
      ) : (
        <Bouton titre="Enregistrer les modifications" onPress={() => enregistrer('enregistrer')} chargement={action === 'enregistrer'} />
      )}>
        {erreur && <Alerte>{erreur}</Alerte>}
        {brouillon && libelleEnregistrementAuto(auto.etat, auto.heure) && (
          <ThemedText type="small" themeColor={auto.etat === 'erreur' ? 'danger' : 'textSecondary'} style={{ textAlign: 'center' }}>
            {libelleEnregistrementAuto(auto.etat, auto.heure)}
          </ThemedText>
        )}
        {!brouillon && type === 'facture' && (
          <Alerte type="info">Les quantités modifiées sont reportées sur le stock à l&apos;enregistrement.</Alerte>
        )}

        {/* En-tête : numéro et date */}
        <Bloc>
          <View style={styles.entete}>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={styles.numero} numberOfLines={2}>
                {existant?.numero ?? `Nouvelle ${libelle.toLowerCase()}`}
              </ThemedText>
              {statut ? <Badge libelle={statut.libelle} ton={statut.ton} />
                : <ThemedText type="small" themeColor="textSecondary">{existant ? 'Brouillon' : parametres?.nom_entreprise}</ThemedText>}
            </View>
            <ChampDate libelle="Date du document" discret valeur={entete.date ?? aujourdhui()}
              onChange={(date) => setEntete((e) => ({ ...e, date }))} />
          </View>
        </Bloc>

        {/* Client */}
        <Bloc>
          <LigneAction onPress={client} libelle={entete.client_nom?.trim() ? `À ${entete.client_nom}` : 'Client'}
            icone={entete.client_nom?.trim() ? undefined : 'ajouter'} chevron />
          {!!entete.client_nom?.trim() && (
            <View style={[styles.sousBloc, { borderTopColor: theme.border }]}>
              <Pilule valeur={entete.client_telephone ?? ''} placeholder="Téléphone" clavier="phone-pad"
                onChange={(client_telephone) => setEntete((e) => ({ ...e, client_telephone }))} />
              <Pilule valeur={entete.client_adresse ?? ''} placeholder="Adresse"
                onChange={(client_adresse) => setEntete((e) => ({ ...e, client_adresse }))} />
            </View>
          )}
        </Bloc>

        {/* Articles */}
        <Bloc>
          {lignes.map((l) => (
            <Pressable key={l.cle} onPress={() => article(l)} accessibilityRole="button" accessibilityLabel={`Modifier ${l.designation}`}
              style={({ pressed }) => [styles.ligne, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="smallBold" style={{ fontSize: 16 }} numberOfLines={2}>{l.designation}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formaterQuantite(l.quantite)} {l.unite ?? ''} × {m(l.prix_unitaire)}
                </ThemedText>
                {type === 'facture' && l.stock !== undefined && l.quantite > l.stock && (
                  <ThemedText type="small" style={{ color: theme.warning }}>Stock disponible : {formaterQuantite(l.stock)}</ThemedText>
                )}
              </View>
              <ThemedText type="smallBold" style={{ fontSize: 16 }}>{m(totalLigne(l))}</ThemedText>
            </Pressable>
          ))}
          <LigneAction onPress={() => article()} libelle="Ajouter un article" icone="ajouter" droite={m(totaux.sous_total)} />
        </Bloc>

        {/* Totaux */}
        <Bloc>
          <View style={styles.totaux}>
            <LigneTotal libelle="Sous-total" valeur={m(totaux.sous_total)} fort />
            {/* Ligne de taxe toujours visible ; sur un brouillon, un appui ouvre le réglage de la taxe */}
            <LigneTotal
              libelle={taxe.taxe_type === 'aucune' || !(Number(taxe.taxe_taux) > 0)
                ? `${taxe.taxe_nom || 'TVA'} (non appliquée)`
                : `${taxe.taxe_nom} ${String(taxe.taxe_taux).replace('.', ',')} %${taxe.taxe_incluse ? ' (incluse)' : ''}${taxe.taxe_type === 'deduction' ? ' (retenue)' : ''}`}
              valeur={m(totaux.montant_taxe)}
              discret
              onPress={brouillon ? () => router.push('/parametres') : undefined}
            />
            <LigneTotal libelle="Total" valeur={m(totaux.total)} discret />
            {type === 'facture' && dejaPaye > 0 && <LigneTotal libelle="Déjà encaissé" valeur={m(dejaPaye)} discret />}
            <View style={[styles.separateur, { backgroundColor: theme.border }]} />
            <LigneTotal libelle={type === 'facture' ? 'Solde dû' : 'Total à payer'} valeur={m(Math.max(0, totaux.total - dejaPaye))} fort accent />
          </View>
        </Bloc>

        {/* Échéance (factures) */}
        {type === 'facture' && (
          <View style={styles.echeance}>
            <ThemedText type="small" themeColor="textSecondary">Date d&apos;échéance</ThemedText>
            {entete.echeance ? (
              <>
                <ChampDate libelle="Date d'échéance" pleineLargeur valeur={entete.echeance}
                  onChange={(echeance) => setEntete((e) => ({ ...e, echeance }))} />
                <Pressable onPress={() => setEntete((e) => ({ ...e, echeance: null }))} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>Sans échéance</ThemedText>
                </Pressable>
              </>
            ) : (
              <Bouton titre="Ajouter une échéance" variante="secondaire"
                onPress={() => setEntete((e) => ({ ...e, echeance: dansJours(e.date ?? aujourdhui(), 7) }))} />
            )}
          </View>
        )}

        <Bloc>
          <TextInput value={entete.notes ?? ''} onChangeText={(notes) => setEntete((e) => ({ ...e, notes }))} multiline
            placeholder="Notes (visibles sur le document)" placeholderTextColor={theme.textSecondary} accessibilityLabel="Notes"
            style={[styles.notes, { color: theme.text }]} />
        </Bloc>
      </Ecran>
    </>
  );
}

// ---------------------------------------------------------------------------
// Éléments du modèle
// ---------------------------------------------------------------------------

function Bloc({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.bloc, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>{children}</View>;
}

/** Ligne cliquable verte (« + Client », « À Abdou », « + Ajouter un article »). */
function LigneAction({ libelle, onPress, icone, chevron, droite }: {
  libelle: string; onPress: () => void; icone?: 'ajouter'; chevron?: boolean; droite?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [styles.action, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
      {icone && <Icone nom={icone} taille={22} couleur={theme.primary} />}
      {/* Sur petit écran, le libellé passe à la ligne plutôt que d'être coupé ; le montant reste entier */}
      <ThemedText style={[styles.actionTexte, { color: theme.primary }]} numberOfLines={2}>{libelle}</ThemedText>
      {droite && <ThemedText style={[styles.actionMontant, { color: theme.primary }]} numberOfLines={1}>{droite}</ThemedText>}
      {chevron && <Icone nom="suivant" taille={18} couleur={theme.primary} />}
    </Pressable>
  );
}

function Pilule({ valeur, onChange, placeholder, clavier }: {
  valeur: string; onChange: (v: string) => void; placeholder: string; clavier?: 'phone-pad';
}) {
  const theme = useTheme();
  return (
    <TextInput value={valeur} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={theme.textSecondary}
      keyboardType={clavier} accessibilityLabel={placeholder}
      style={[styles.pilule, { color: theme.text, backgroundColor: theme.backgroundSelected }]} />
  );
}

function LigneTotal({ libelle, valeur, fort, discret, accent, onPress }: {
  libelle: string; valeur: string; fort?: boolean; discret?: boolean; accent?: boolean; onPress?: () => void;
}) {
  const theme = useTheme();
  const style = { fontSize: 18, fontWeight: fort ? ('700' as const) : ('500' as const) };
  const contenu = (
    <>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
        <ThemedText style={[style, { flexShrink: 1, color: discret ? theme.textSecondary : theme.text }]}>{libelle}</ThemedText>
        {onPress && <Icone nom="suivant" taille={14} couleur={theme.textSecondary} />}
      </View>
      <ThemedText style={[style, { color: accent ? theme.primary : theme.text }]}>{valeur}</ThemedText>
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${libelle} : régler la taxe`}
      style={({ pressed }) => [styles.total, { opacity: pressed ? 0.6 : 1 }]}>{contenu}</Pressable>
  ) : <View style={styles.total}>{contenu}</View>;
}

const styles = StyleSheet.create({
  bloc: { borderRadius: Rayons.grand + 4, borderWidth: 1, overflow: 'hidden' },
  entete: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, padding: Spacing.three + Spacing.one },
  numero: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.one, paddingHorizontal: Spacing.three + Spacing.one,
    paddingVertical: Spacing.two, minHeight: 64 },
  actionTexte: { flex: 1, flexShrink: 1, fontSize: 18, lineHeight: 24, fontWeight: '500' },
  actionMontant: { flexShrink: 0, fontSize: 16, lineHeight: 22 },
  sousBloc: { borderTopWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  pilule: { minHeight: 48, borderRadius: Rayons.grand + 4, paddingHorizontal: Spacing.three, fontSize: 16 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three + Spacing.one,
    paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  totaux: { padding: Spacing.three + Spacing.one, gap: Spacing.three },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three },
  separateur: { height: StyleSheet.hairlineWidth },
  echeance: { gap: Spacing.two, paddingHorizontal: Spacing.one },
  notes: { minHeight: 72, padding: Spacing.three + Spacing.one, fontSize: 16, textAlignVertical: 'top' },
});

/** État d'un document sérialisé (sans les clés d'affichage) pour repérer les modifications. */
function signatureDocument(entete: EnteteDocument, lignes: Ligne[]): string {
  return JSON.stringify([entete, lignes.map(({ produit_id, designation, unite, prix_unitaire, quantite, taxable }) =>
    [produit_id, designation, unite, prix_unitaire, quantite, taxable])]);
}

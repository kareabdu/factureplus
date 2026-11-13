import {
  annulerDocument, chargerDocument, convertirProforma, creerBonLivraison, formaterMontant, formaterQuantite,
  LIBELLES_MODE_PAIEMENT, LIBELLES_TYPE_DOCUMENT, refuserProforma, resteAPayer, statutAffiche, supprimerReglement,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Bouton, BoutonIcone, Carte, ChargementPlein, Ecran, ErreurChargement, Info, LigneListe, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { confirmer, signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { envoyerSurWhatsApp, imprimer, partagerPdf } from '@/lib/pdf';
import { supabase } from '@/lib/supabase';

/** Document validé : consultation, règlements, PDF, BL, conversion, annulation. */
export default function VoirDocument() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { parametres } = useEquipe();
  const symbole = parametres?.symbole_devise ?? 'FCFA';
  const m = (v: number) => formaterMontant(v, symbole);
  const [occupe, setOccupe] = useState<string | null>(null);
  const { donnees, erreur, recharger } = useDonnees(() => chargerDocument(supabase, id), [id]);
  useFocusEffect(useCallback(() => { void recharger(); }, [recharger]));

  if (erreur && !donnees) return <Ecran enTete><ErreurChargement message={erreur} reessayer={recharger} /></Ecran>;
  if (!donnees || !parametres) return <ChargementPlein />;
  const { document: d, lignes, reglements } = donnees;
  const s = statutAffiche(d);
  const reste = resteAPayer(d);
  const libelle = LIBELLES_TYPE_DOCUMENT[d.type];

  async function executer(cle: string, fn: () => Promise<unknown>) {
    setOccupe(cle);
    try {
      await fn();
    } catch (e) {
      signalerErreur(e);
    } finally {
      setOccupe(null);
    }
  }

  const annuler = () => executer('annuler', async () => {
    const msg = d.type === 'facture' ? 'Le stock des articles sera réintégré. Cette action est définitive.' : 'Cette action est définitive.';
    if (!(await confirmer(`Annuler ${d.numero}`, msg, 'Annuler le document', true))) return;
    await annulerDocument(supabase, d.id);
    vibrerSucces();
    await recharger();
  });

  const convertir = () => executer('convertir', async () => {
    const factureId = await convertirProforma(supabase, d.id);
    router.replace({ pathname: '/document/editer', params: { id: factureId, type: 'facture' } });
  });

  const bl = () => executer('bl', async () => {
    const blId = await creerBonLivraison(supabase, d.id);
    vibrerSucces();
    router.push(`/document/${blId}`);
  });

  return (
    <>
      <Stack.Screen options={{
        title: d.numero ?? libelle,
        headerRight: () => (
          <BoutonIcone icone="modifier" libelle="Modifier"
            onPress={() => router.push({ pathname: '/document/editer', params: { id: d.id, type: d.type } })} />
        ),
      }} />
      <Ecran enTete rafraichir={recharger}>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <ThemedText type="small" themeColor="textSecondary">{libelle} · {new Date(`${d.date}T00:00:00`).toLocaleDateString('fr-FR')}</ThemedText>
            <Badge libelle={s.libelle} ton={s.ton} />
          </View>
          <ThemedText type="smallBold" style={{ fontSize: 22, lineHeight: 28 }}>{d.client_nom}</ThemedText>
          {d.client_telephone && <ThemedText type="small" themeColor="textSecondary">{d.client_telephone}</ThemedText>}
        </View>

        {d.type !== 'bl' && (
          <Carte>
            <Info libelle="Total" valeur={m(d.total)} fort />
            {d.type === 'facture' && (
              <>
                <Info libelle="Payé" valeur={m(d.montant_paye)} />
                <Info libelle="Reste à payer" valeur={m(reste)} fort={reste > 0} />
              </>
            )}
          </Carte>
        )}

        <View style={{ gap: Spacing.two }}>
          {d.type === 'facture' && d.statut === 'emis' && (
            <Bouton titre={`Encaisser ${m(reste)}`} icone="paiement" onPress={() => router.push({ pathname: '/document/reglement', params: { id: d.id } })} />
          )}
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Bouton titre="Partager PDF" icone="partager" variante="secondaire" chargement={occupe === 'pdf'}
              onPress={() => executer('pdf', () => partagerPdf(d.id, parametres))} />
            <Bouton titre="Imprimer" icone="imprimer" variante="secondaire" onPress={() => executer('imprimer', () => imprimer(d.id, parametres))} />
          </View>
          <Bouton titre={`Modifier ${d.type === 'bl' ? 'le bon' : 'la ' + libelle.toLowerCase()}`} icone="modifier" variante="secondaire"
            onPress={() => router.push({ pathname: '/document/editer', params: { id: d.id, type: d.type } })} />
          {d.client_telephone && (
            <Bouton titre="Envoyer sur WhatsApp (avec PDF)" variante="secondaire" chargement={occupe === 'wa'}
              onPress={() => executer('wa', () => envoyerSurWhatsApp(d.id, parametres))} />
          )}
          {d.type === 'proforma' && d.statut === 'emis' && (
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <Bouton titre="Accepté → facture" icone="valider" onPress={convertir} chargement={occupe === 'convertir'} />
              <Bouton titre="Refusé" variante="secondaire" onPress={() => executer('refuser', async () => { await refuserProforma(supabase, d.id); await recharger(); })} />
            </View>
          )}
          {d.type === 'facture' && (d.statut === 'emis' || d.statut === 'paye') && (
            <Bouton titre="Créer le bon de livraison" icone="livraison" variante="secondaire" onPress={bl} chargement={occupe === 'bl'} />
          )}
        </View>

        <Section titre={`Articles (${lignes.length})`}>
          {lignes.map((l, i) => (
            <LigneListe key={l.id ?? i} titre={l.designation}
              sousTitre={d.type === 'bl' ? `${formaterQuantite(l.quantite)} ${l.unite ?? ''}` : `${formaterQuantite(l.quantite)} × ${m(l.prix_unitaire)}`}
              droite={d.type === 'bl' ? undefined : m(l.total ?? 0)}
              onPress={l.produit_id ? () => router.push(`/produit/${l.produit_id}`) : undefined} />
          ))}
        </Section>

        {d.type !== 'bl' && d.montant_taxe !== 0 && (
          <Carte>
            <Info libelle="Sous-total" valeur={m(d.sous_total)} />
            <Info libelle={`${d.taxe_nom} ${d.taxe_taux} %${d.taxe_incluse ? ' (incluse)' : ''}`} valeur={m(d.montant_taxe)} />
            <Info libelle="Total" valeur={m(d.total)} fort />
          </Carte>
        )}

        {reglements.length > 0 && (
          <Section titre="Règlements">
            {reglements.map((r) => (
              <LigneListe key={r.id} icone="paiement" titre={LIBELLES_MODE_PAIEMENT[r.mode]}
                sousTitre={`${new Date(`${r.date}T00:00:00`).toLocaleDateString('fr-FR')}${r.reference ? ` · ${r.reference}` : ''}`}
                droite={m(r.montant)}
                onPress={d.statut === 'annule' ? undefined : async () => {
                  if (await confirmer('Supprimer le règlement', `Supprimer le règlement de ${m(r.montant)} ?`, 'Supprimer', true)) {
                    await executer('reg', async () => { await supprimerReglement(supabase, r.id); await recharger(); });
                  }
                }} />
            ))}
          </Section>
        )}

        {d.source_id && (
          <LigneListe icone="document" titre={d.type === 'bl' ? 'Facture d’origine' : 'Proforma d’origine'} onPress={() => router.push(`/document/${d.source_id}`)} />
        )}
        {d.notes && <Carte titre="Notes"><ThemedText type="small">{d.notes}</ThemedText></Carte>}

        {d.statut !== 'annule' && d.statut !== 'refuse' && d.statut !== 'accepte' && (
          <Bouton titre={`Annuler ${d.type === 'bl' ? 'le bon' : 'la ' + libelle.toLowerCase()}`} icone="annuler" variante="danger"
            onPress={annuler} chargement={occupe === 'annuler'} />
        )}
      </Ecran>
    </>
  );
}

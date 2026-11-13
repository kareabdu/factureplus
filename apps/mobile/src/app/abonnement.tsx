import {
  ECONOMIE_ANNUELLE, formaterMontant, lancerPaiementAbonnement, LIBELLES_ETATS_ACCES, LIBELLES_MOYENS_ABONNEMENT, liensOuverturePaiement,
  LIBELLES_STATUTS_PAIEMENT, listerMesPaiements, MOYENS_PAIEMENT_ABONNEMENT, paiementEnCours, PLANS_ABONNEMENT,
  verifierPaiementAbonnement, type MoyenPaiementAbonnement, type PlanAbonnement,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Badge, Bouton, Carte, Champ, ChargementPlein, Ecran, Info, LigneListe, Section } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { vibrerSucces } from '@/lib/confirmer';
import { useEquipe, useSession } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

/** Logos des moyens de paiement (repris de l'ancienne application) */
const LOGOS_PAIEMENT: Record<MoyenPaiementAbonnement, number> = {
  wave: require('@/assets/images/paiement-wave.png'),
  orange_maxit: require('@/assets/images/paiement-maxit.png'),
};

/** Abonnement : état de l'accès, choix de la formule et paiement Wave / Orange Money (Unitech Pay). */
export default function Abonnement() {
  const { paiement: retour } = useLocalSearchParams<{ paiement?: string }>();
  const { userId } = useSession();
  const { profil, abonnement, rafraichir } = useEquipe();
  const theme = useTheme();
  const [plan, setPlan] = useState<PlanAbonnement>('annuel');
  const [moyen, setMoyen] = useState<MoyenPaiementAbonnement>('wave');
  const [telephone, setTelephone] = useState(profil?.telephone ?? '');
  const [qr, setQr] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur' | 'info'; texte: string } | null>(
    retour === 'annule' ? { type: 'info', texte: 'Paiement annulé. Vous pouvez réessayer.' } : null,
  );
  const [chargement, setChargement] = useState(false);
  const { donnees: paiements, recharger } = useDonnees(() => listerMesPaiements(supabase, userId!), [userId]);
  const enCours = paiementEnCours(paiements ?? []);
  const verification = useRef(false);

  // Vérifie auprès d'Unitech Pay (filet de secours du webhook) puis recharge l'état
  const verifier = useCallback(async (silencieux = true) => {
    if (verification.current) return;
    verification.current = true;
    try {
      const r = await verifierPaiementAbonnement(supabase);
      if (r.actif) {
        vibrerSucces();
        setQr(null);
        setMessage({ type: 'succes', texte: 'Paiement confirmé : votre abonnement est actif. Merci !' });
        await rafraichir();
      } else if (!silencieux) {
        setMessage({ type: 'info', texte: 'Paiement pas encore confirmé. Réessayez dans un instant.' });
      }
      await recharger();
    } catch (e) {
      if (!silencieux) setMessage({ type: 'erreur', texte: (e as Error).message });
    } finally {
      verification.current = false;
    }
  }, [rafraichir, recharger]);

  // Retour de la page de paiement (lien factureplus://abonnement?paiement=succes)
  useEffect(() => {
    if (retour !== 'succes') return;
    const t = setTimeout(() => void verifier(false), 0);
    return () => clearTimeout(t);
  }, [retour, verifier]);

  // Paiement en attente : vérification régulière et au retour dans l'application
  useEffect(() => {
    if (!enCours) return;
    const minuterie = setInterval(() => void verifier(), 8000);
    const abonnementAppli = AppState.addEventListener('change', (e) => { if (e === 'active') void verifier(); });
    return () => {
      clearInterval(minuterie);
      abonnementAppli.remove();
    };
  }, [enCours, verifier]);

  if (!profil || !abonnement || !paiements) return <ChargementPlein />;

  async function payer() {
    const avecTelephone = MOYENS_PAIEMENT_ABONNEMENT.find((x) => x.code === moyen)?.telephone;
    if (avecTelephone && telephone.replace(/\D/g, '').length < 9) {
      return setMessage({ type: 'erreur', texte: 'Indiquez le numéro Orange Money qui va payer.' });
    }
    setMessage(null);
    setChargement(true);
    try {
      const r = await lancerPaiementAbonnement(supabase, { plan, moyen, telephone: telephone.trim() || undefined });
      await recharger();
      // Orange Money : application Max It en priorité ; repli sur la page de paiement si elle n'est pas installée
      let ouvert = false;
      for (const lien of liensOuverturePaiement(moyen, r)) {
        try {
          await Linking.openURL(lien);
          ouvert = true;
          break;
        } catch {
          // application absente : lien suivant
        }
      }
      if (ouvert) {
        setMessage({ type: 'info', texte: 'Terminez le paiement puis revenez ici : votre abonnement s\'activera automatiquement.' });
      } else if (r.qr_code) {
        setQr(r.qr_code);
        setMessage({ type: 'info', texte: 'Scannez ce QR code avec Orange Money. L\'abonnement s\'activera automatiquement.' });
      } else {
        setMessage({ type: 'erreur', texte: 'Réponse inattendue du service de paiement. Réessayez.' });
      }
    } catch (e) {
      setMessage({ type: 'erreur', texte: (e as Error).message });
    } finally {
      setChargement(false);
    }
  }

  const tonEtat = abonnement.etat === 'expire' ? 'danger' : abonnement.etat === 'essai' ? 'attention' : 'succes';
  const finTexte = abonnement.fin?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Ecran enTete rafraichir={async () => { await rafraichir(); await recharger(); }}>
      {message && <Alerte type={message.type}>{message.texte}</Alerte>}

      <Carte>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Icone nom="abonnement" taille={22} couleur={theme.primary} />
          <ThemedText type="smallBold" style={{ flex: 1, fontSize: 17 }}>Mon accès</ThemedText>
          <Badge libelle={LIBELLES_ETATS_ACCES[abonnement.etat]} ton={tonEtat} />
        </View>
        {abonnement.etat === 'admin' && <ThemedText type="small" themeColor="textSecondary">Administrateur : accès permanent, sans abonnement.</ThemedText>}
        {abonnement.etat === 'actif' && (
          <>
            <Info libelle="Formule" valeur={abonnement.plan ? PLANS_ABONNEMENT[abonnement.plan].libelle : '—'} />
            <Info libelle="Jusqu'au" valeur={finTexte ?? '—'} fort />
          </>
        )}
        {abonnement.etat === 'essai' && <Info libelle="Essai gratuit jusqu'au" valeur={finTexte ?? '—'} fort />}
        {abonnement.etat === 'expire' && (
          <ThemedText type="small" themeColor="textSecondary">
            Vos données restent consultables, mais vous ne pouvez plus rien créer ni modifier. Abonnez-vous pour tout débloquer.
          </ThemedText>
        )}
      </Carte>

      {enCours && (
        <Carte>
          <ThemedText type="smallBold">Paiement en attente de confirmation</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {PLANS_ABONNEMENT[enCours.plan].libelle} · {formaterMontant(enCours.montant)} · {LIBELLES_MOYENS_ABONNEMENT[enCours.moyen]}
          </ThemedText>
          <Bouton titre="J'ai payé, vérifier" variante="secondaire" icone="valider" onPress={() => verifier(false)} />
        </Carte>
      )}

      {qr && (
        <Carte>
          <ThemedText type="smallBold">QR code Orange Money</ThemedText>
          <Image source={{ uri: qr.startsWith('http') || qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}` }}
            style={{ width: 220, height: 220, alignSelf: 'center' }} contentFit="contain" />
        </Carte>
      )}

      {abonnement.etat !== 'admin' && (
        <Section titre={abonnement.etat === 'actif' ? 'Prolonger mon abonnement' : 'Choisir une formule'}>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {(Object.keys(PLANS_ABONNEMENT) as PlanAbonnement[]).map((code) => {
              const p = PLANS_ABONNEMENT[code];
              const choisi = plan === code;
              return (
                <Pressable key={code} onPress={() => setPlan(code)} accessibilityRole="radio" accessibilityState={{ selected: choisi }}
                  style={{
                    flex: 1, gap: 4, padding: Spacing.three, borderRadius: Rayons.moyen, borderWidth: choisi ? 2 : 1,
                    borderColor: choisi ? theme.primary : theme.border, backgroundColor: theme.backgroundElement,
                  }}>
                  <ThemedText type="smallBold">{p.libelle}</ThemedText>
                  <ThemedText style={{ fontSize: 20, lineHeight: 26, fontWeight: 700 }} numberOfLines={1} adjustsFontSizeToFit>
                    {formaterMontant(p.montant)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{p.periode}</ThemedText>
                  {code === 'annuel' && <Badge libelle={`${formaterMontant(ECONOMIE_ANNUELLE)} d'économie`} ton="succes" />}
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Tout inclus : factures, proformas et bons de livraison illimités, stock, achats, dépenses, export PDF.
          </ThemedText>
          <ThemedText type="smallBold">Payer avec</ThemedText>
          <View style={{ flexDirection: 'row', gap: Spacing.two }} accessibilityRole="radiogroup">
            {MOYENS_PAIEMENT_ABONNEMENT.map((x) => {
              const choisi = moyen === x.code;
              return (
                <Pressable key={x.code} onPress={() => setMoyen(x.code)} accessibilityRole="radio" accessibilityState={{ selected: choisi }}
                  accessibilityLabel={x.libelle}
                  style={{
                    flex: 1, alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three, borderRadius: Rayons.moyen,
                    borderWidth: choisi ? 2 : 1, borderColor: choisi ? theme.primary : theme.border,
                    backgroundColor: choisi ? theme.primarySoft : theme.backgroundElement,
                  }}>
                  <Image source={LOGOS_PAIEMENT[x.code]} style={{ width: 36, height: 36, borderRadius: 9 }} contentFit="cover" />
                  <ThemedText type="smallBold" style={{ color: choisi ? theme.primary : theme.text }}>{x.libelle}</ThemedText>
                </Pressable>
              );
            })}
          </View>
          {MOYENS_PAIEMENT_ABONNEMENT.find((x) => x.code === moyen)?.telephone && (
            <Champ libelle="Numéro Orange Money" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad"
              autoComplete="tel" placeholder="77 000 00 00" />
          )}
          <Bouton titre={`Payer ${formaterMontant(PLANS_ABONNEMENT[plan].montant)}`} icone="paiement" onPress={payer} chargement={chargement} />
        </Section>
      )}

      {paiements.length > 0 && (
        <Section titre="Historique des paiements">
          {paiements.map((p) => (
            <LigneListe key={p.id} titre={`${PLANS_ABONNEMENT[p.plan].libelle} · ${LIBELLES_MOYENS_ABONNEMENT[p.moyen]}`}
              sousTitre={new Date(p.paye_le ?? p.created_at).toLocaleDateString('fr-FR')} droite={formaterMontant(p.montant)}
              badge={<Badge libelle={LIBELLES_STATUTS_PAIEMENT[p.statut]}
                ton={p.statut === 'paye' ? 'succes' : p.statut === 'en_attente' ? 'attention' : 'neutre'} />} />
          ))}
        </Section>
      )}
    </Ecran>
  );
}

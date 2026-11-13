import {
  definirAbonnement, finProposee, formaterMontant, LIBELLES_ETATS_ACCES, listerUtilisateursPlateforme, PLANS_ABONNEMENT,
  prolongerEssai, TONS_ETATS_ACCES, type PlanAbonnement,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ChampDate } from '@/components/champ-date';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Badge, Bouton, Carte, ChargementPlein, Ecran, Info, Interrupteur, Pastilles, Section, Vide } from '@/components/ui';
import { confirmer, vibrerSucces } from '@/lib/confirmer';
import { dateCourte } from '@/lib/dates';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

/** Fiche d'un compte : activation manuelle, prolongation d'essai, arrêt de l'accès. */
export default function FicheUtilisateur() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { estAdmin } = useEquipe();
  const { donnees, chargement, recharger } = useDonnees(
    () => (estAdmin ? listerUtilisateursPlateforme(supabase).then((l) => l.find((u) => u.id === id) ?? null) : Promise.resolve(null)),
    [id, estAdmin],
  );
  const [plan, setPlan] = useState<PlanAbonnement>('mensuel');
  const [fin, setFin] = useState(() => finProposee('mensuel'));
  const [encaisse, setEncaisse] = useState(true);
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);
  const [action, setAction] = useState<string | null>(null);

  if (!estAdmin) return <Ecran enTete><Vide icone="admin" titre="Réservé aux administrateurs" /></Ecran>;
  if (chargement && !donnees) return <ChargementPlein />;
  if (!donnees) return <Ecran enTete><Vide icone="compte" titre="Compte introuvable" /></Ecran>;
  const u = donnees;

  async function executer(cle: string, f: () => Promise<void>, succes: string) {
    setAction(cle);
    setMessage(null);
    try {
      await f();
      await recharger();
      vibrerSucces();
      setMessage({ type: 'succes', texte: succes });
    } catch (e) {
      setMessage({ type: 'erreur', texte: (e as Error).message });
    } finally {
      setAction(null);
    }
  }

  const montant = encaisse ? PLANS_ABONNEMENT[plan].montant : 0;

  return (
    <>
      <Stack.Screen options={{ title: u.entreprise || u.email || 'Compte' }} />
      <Ecran enTete>
        {message && <Alerte type={message.type}>{message.texte}</Alerte>}
        <Carte>
          <Badge libelle={LIBELLES_ETATS_ACCES[u.etat]} ton={TONS_ETATS_ACCES[u.etat]} />
          <Info libelle="E-mail" valeur={u.email ?? '—'} />
          {u.nom_complet && <Info libelle="Nom" valeur={u.nom_complet} />}
          {u.telephone && <Info libelle="Téléphone" valeur={u.telephone} />}
          <Info libelle="Entreprise" valeur={u.entreprise ?? '—'} />
          <Info libelle="Inscription" valeur={dateCourte(u.created_at.slice(0, 10))} />
          <Info libelle="Fin d'essai" valeur={dateCourte(u.essai_fin.slice(0, 10))} />
          {u.abonnement_fin && <Info libelle="Fin d'abonnement" valeur={`${dateCourte(u.abonnement_fin)} (${u.abonnement_plan ?? '—'})`} fort />}
          <Info libelle="Documents" valeur={String(u.documents)} />
          {u.derniere_activite && <Info libelle="Dernière activité" valeur={dateCourte(u.derniere_activite.slice(0, 10))} />}
        </Carte>

        {u.etat !== 'admin' && (
          <>
            <Section titre="Activer un abonnement">
              <Pastilles options={(Object.keys(PLANS_ABONNEMENT) as PlanAbonnement[]).map((code) => ({ code, libelle: PLANS_ABONNEMENT[code].libelle }))}
                valeur={plan} onChange={(p) => { setPlan(p); setFin(finProposee(p)); }} />
              <ThemedText type="smallBold">Jusqu&apos;au</ThemedText>
              <ChampDate libelle="Fin de l'abonnement" valeur={fin} onChange={setFin} pleineLargeur />
              <Interrupteur libelle={`Paiement reçu (${formaterMontant(PLANS_ABONNEMENT[plan].montant)})`} valeur={encaisse} onChange={setEncaisse}
                aide="Enregistre le montant dans les revenus (espèces, virement…)" />
              <Bouton titre="Activer" icone="valider" chargement={action === 'activer'}
                onPress={() => executer('activer', () => definirAbonnement(supabase, u.id, plan, fin, montant), 'Abonnement activé.')} />
            </Section>

            <Section titre="Autres actions">
              <Bouton titre="Prolonger l'essai de 7 jours" variante="secondaire" chargement={action === 'essai'}
                onPress={() => executer('essai', () => prolongerEssai(supabase, u.id, 7), "Essai prolongé de 7 jours.")} />
              {u.etat !== 'expire' && (
                <Bouton titre="Arrêter l'accès" variante="danger" chargement={action === 'arreter'}
                  onPress={async () => {
                    if (!(await confirmer("Arrêter l'accès", `${u.email} passera en lecture seule immédiatement.`, 'Arrêter', true))) return;
                    await executer('arreter', () => definirAbonnement(supabase, u.id, null), 'Accès arrêté : compte en lecture seule.');
                  }} />
              )}
            </Section>
          </>
        )}
      </Ecran>
    </>
  );
}

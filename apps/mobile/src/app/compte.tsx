import { accesActif, formaterMontant, joursEssaiRestants, modifierProfil, TARIFS, traduireErreur } from '@factureplus/core';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Carte, Champ, ChargementPlein, Ecran, Info, Section } from '@/components/ui';
import { vibrerSucces } from '@/lib/confirmer';
import { useEquipe, useSession } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Compte() {
  const { userId, email } = useSession();
  const { profil, rafraichir } = useEquipe();
  const [nom, setNom] = useState(profil?.nom_complet ?? '');
  const [telephone, setTelephone] = useState(profil?.telephone ?? '');
  const [motDePasse, setMotDePasse] = useState('');
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);
  const [chargement, setChargement] = useState<string | null>(null);
  if (!profil || !userId) return <ChargementPlein />;

  const essai = joursEssaiRestants(profil);
  const actif = accesActif(profil);

  async function enregistrer() {
    setChargement('profil');
    try {
      await modifierProfil(supabase, userId!, { nom_complet: nom.trim() || null, telephone: telephone.trim() || null });
      await rafraichir();
      vibrerSucces();
      setMessage({ type: 'succes', texte: 'Profil enregistré.' });
    } catch (e) {
      setMessage({ type: 'erreur', texte: (e as Error).message });
    } finally {
      setChargement(null);
    }
  }

  async function changerMotDePasse() {
    if (motDePasse.length < 8) return setMessage({ type: 'erreur', texte: 'Le mot de passe doit contenir au moins 8 caractères.' });
    setChargement('mdp');
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setChargement(null);
    if (error) return setMessage({ type: 'erreur', texte: traduireErreur(error) });
    setMotDePasse('');
    vibrerSucces();
    setMessage({ type: 'succes', texte: 'Mot de passe modifié.' });
  }

  return (
    <Ecran enTete>
      {message && <Alerte type={message.type}>{message.texte}</Alerte>}

      <Section titre="Abonnement">
        <Carte>
          {profil.abonnement_statut === 'actif' ? (
            <>
              <Info libelle="Formule" valeur={profil.abonnement_plan === 'annuel' ? 'Annuelle' : 'Mensuelle'} fort />
              {profil.abonnement_fin && <Info libelle="Jusqu'au" valeur={new Date(profil.abonnement_fin).toLocaleDateString('fr-FR')} />}
            </>
          ) : (
            <Info libelle="Essai gratuit" valeur={essai > 0 ? `${essai} jour${essai > 1 ? 's' : ''} restant${essai > 1 ? 's' : ''}` : 'Terminé'} fort />
          )}
          {!actif && <Alerte type="attention">Votre accès a expiré.</Alerte>}
          <ThemedText type="small" themeColor="textSecondary">
            Mensuel {formaterMontant(TARIFS.mensuel)} · Annuel {formaterMontant(TARIFS.annuel)}. Le paiement Wave / Orange Money dans l&apos;application arrive bientôt.
          </ThemedText>
        </Carte>
      </Section>

      <Section titre="Profil">
        <Info libelle="E-mail" valeur={email ?? ''} />
        <Champ libelle="Nom" value={nom} onChangeText={setNom} autoComplete="name" />
        <Champ libelle="Téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" autoComplete="tel" />
        <Bouton titre="Enregistrer le profil" onPress={enregistrer} chargement={chargement === 'profil'} />
      </Section>

      <Section titre="Sécurité">
        <Champ libelle="Nouveau mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry autoComplete="new-password" />
        <Bouton titre="Changer le mot de passe" variante="secondaire" onPress={changerMotDePasse} chargement={chargement === 'mdp'} />
      </Section>
    </Ecran>
  );
}

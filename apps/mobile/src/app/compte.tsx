import { LIBELLES_ETATS_ACCES, modifierProfil, SITE_WEB, supprimerMonCompte, traduireErreur } from '@factureplus/core';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { Alerte, Bouton, Champ, ChargementPlein, Ecran, Info, LigneListe, Section } from '@/components/ui';
import { confirmer, signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe, useSession } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Compte() {
  // Arrivée par le lien « Mot de passe oublié » : l'utilisateur doit choisir un nouveau mot de passe
  const reinitialisation = useLocalSearchParams<{ reinitialisation?: string }>().reinitialisation === '1';
  return reinitialisation ? <NouveauMotDePasse /> : <MonCompte />;
}

/** Arrivée par le lien « Mot de passe oublié » : seulement le nouveau mot de passe et sa confirmation. */
function NouveauMotDePasse() {
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function valider() {
    if (motDePasse.length < 8) return setErreur('Le mot de passe doit contenir au moins 8 caractères.');
    if (motDePasse !== confirmation) return setErreur('Les deux mots de passe ne sont pas identiques.');
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setChargement(false);
    if (error) return setErreur(traduireErreur(error));
    vibrerSucces();
    router.replace('/');
  }

  return (
    <Ecran enTete>
      <Stack.Screen options={{ title: 'Nouveau mot de passe' }} />
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="Nouveau mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry autoComplete="new-password"
        textContentType="newPassword" autoFocus aide="8 caractères minimum" />
      <Champ libelle="Confirmer le mot de passe" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password"
        textContentType="newPassword" returnKeyType="done" onSubmitEditing={valider} />
      <Bouton titre="Valider" onPress={valider} chargement={chargement} />
    </Ecran>
  );
}

function MonCompte() {
  const { userId, email } = useSession();
  const { profil, abonnement, rafraichir, equipe } = useEquipe();
  const [nom, setNom] = useState(profil?.nom_complet ?? '');
  const [telephone, setTelephone] = useState(profil?.telephone ?? '');
  const [motDePasse, setMotDePasse] = useState('');
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null);
  const [chargement, setChargement] = useState<string | null>(null);
  if (!profil || !userId) return <ChargementPlein />;

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

  async function supprimerCompte() {
    const nomEntreprise = equipe ? `l'entreprise « ${equipe.nom} »` : 'votre entreprise';
    if (!(await confirmer('Supprimer mon compte ?',
      `Votre compte, ${nomEntreprise} et toutes leurs données (produits, ventes, achats, dépenses, fichiers) seront supprimés définitivement.`,
      'Continuer', true))) return;
    if (!(await confirmer('Confirmer la suppression',
      "Cette action est irréversible. Un abonnement en cours n'est pas remboursé.", 'Supprimer définitivement', true))) return;
    setChargement('suppression');
    try {
      await supprimerMonCompte(supabase, equipe?.id ?? null);
      await supabase.auth.signOut(); // la navigation revient d'elle-même à la connexion
    } catch (e) {
      setChargement(null);
      signalerErreur(new Error(traduireErreur(e)), 'Suppression impossible');
    }
  }

  return (
    <Ecran enTete>
      {message && <Alerte type={message.type}>{message.texte}</Alerte>}

      <Section titre="Abonnement">
        <LigneListe icone="abonnement" titre={abonnement ? LIBELLES_ETATS_ACCES[abonnement.etat] : 'Abonnement'}
          sousTitre={abonnement?.etat === 'admin' ? 'Accès permanent' : abonnement?.fin
            ? `${abonnement.etat === 'expire' ? 'Terminé le' : "Jusqu'au"} ${abonnement.fin.toLocaleDateString('fr-FR')}` : undefined}
          onPress={() => router.push('/abonnement')} />
      </Section>

      <Section titre="Profil">
        <Info libelle="E-mail" valeur={email ?? ''} />
        <Champ libelle="Nom" value={nom} onChangeText={setNom} autoComplete="name" />
        <Champ libelle="Téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" autoComplete="tel" />
        <Bouton titre="Enregistrer le profil" onPress={enregistrer} chargement={chargement === 'profil'} />
      </Section>

      <Section titre="Sécurité">
        <Champ libelle="Nouveau mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry autoComplete="new-password"
          aide="8 caractères minimum" />
        <Bouton titre="Changer le mot de passe" variante="secondaire" onPress={changerMotDePasse} chargement={chargement === 'mdp'} />
      </Section>

      <Section titre="Aide">
        <LigneListe icone="document" titre="Politique de confidentialité" onPress={() => WebBrowser.openBrowserAsync(`${SITE_WEB}/confidentialite`)} />
        <LigneListe icone="compte" titre="Assistance" sousTitre="WhatsApp, e-mail" onPress={() => WebBrowser.openBrowserAsync(`${SITE_WEB}/assistance`)} />
      </Section>

      <Section titre="Supprimer mon compte">
        <Info libelle="Effet" valeur="Compte, entreprise et données effacés définitivement" />
        <Bouton titre="Supprimer mon compte" variante="danger" onPress={supprimerCompte} chargement={chargement === 'suppression'} />
      </Section>
    </Ecran>
  );
}

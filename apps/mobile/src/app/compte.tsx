import { LIBELLES_ETATS_ACCES, modifierProfil, traduireErreur } from '@factureplus/core';
import { router } from 'expo-router';
import { useState } from 'react';

import { Alerte, Bouton, Champ, ChargementPlein, Ecran, Info, LigneListe, Section } from '@/components/ui';
import { vibrerSucces } from '@/lib/confirmer';
import { useEquipe, useSession } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Compte() {
  const { userId, email } = useSession();
  const { profil, abonnement, rafraichir } = useEquipe();
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
        <Champ libelle="Nouveau mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry autoComplete="new-password" />
        <Bouton titre="Changer le mot de passe" variante="secondaire" onPress={changerMotDePasse} chargement={chargement === 'mdp'} />
      </Section>
    </Ecran>
  );
}

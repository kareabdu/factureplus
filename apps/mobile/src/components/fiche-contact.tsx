import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';

import { Alerte, Bouton, Champ, Ecran } from '@/components/ui';
import { confirmer, signalerErreur, vibrerSucces } from '@/lib/confirmer';

export interface SaisieContact {
  nom: string;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  contact?: string | null;
  notes?: string | null;
}

/** Formulaire commun client / fournisseur (création ou modification). */
export function FicheContact({ initial, avecContact = false, enregistrer, supprimer, children }: {
  initial: SaisieContact;
  avecContact?: boolean;
  enregistrer: (s: SaisieContact) => Promise<unknown>;
  supprimer?: () => Promise<unknown>;
  /** Contenu complémentaire (historique…) */
  children?: ReactNode;
}) {
  const [s, setS] = useState<SaisieContact>(initial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const maj = (c: Partial<SaisieContact>) => setS((v) => ({ ...v, ...c }));

  async function valider() {
    if (!s.nom.trim()) return setErreur('Le nom est obligatoire.');
    setErreur(null);
    setChargement(true);
    try {
      const vide = (v?: string | null) => v?.trim() || null;
      await enregistrer({ nom: s.nom.trim(), telephone: vide(s.telephone), email: vide(s.email), adresse: vide(s.adresse),
        ...(avecContact ? { contact: vide(s.contact) } : {}), notes: vide(s.notes) });
      vibrerSucces();
      router.back();
    } catch (e) {
      setErreur((e as Error).message);
      setChargement(false);
    }
  }

  async function effacer() {
    if (!supprimer || !(await confirmer('Supprimer', `Supprimer « ${s.nom} » ?`, 'Supprimer', true))) return;
    try {
      await supprimer();
      router.back();
    } catch (e) {
      signalerErreur(e);
    }
  }

  return (
    <Ecran enTete pied={<Bouton titre="Enregistrer" onPress={valider} chargement={chargement} />}>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle="Nom *" value={s.nom} onChangeText={(nom) => maj({ nom })} autoCapitalize="words" />
      <Champ libelle="Téléphone" value={s.telephone ?? ''} onChangeText={(telephone) => maj({ telephone })} keyboardType="phone-pad"
        autoComplete="tel" placeholder="+221 77 000 00 00" />
      {avecContact && <Champ libelle="Personne à contacter" value={s.contact ?? ''} onChangeText={(contact) => maj({ contact })} />}
      <Champ libelle="E-mail" value={s.email ?? ''} onChangeText={(email) => maj({ email })} keyboardType="email-address" autoCapitalize="none" />
      <Champ libelle="Adresse" value={s.adresse ?? ''} onChangeText={(adresse) => maj({ adresse })} />
      <Champ libelle="Notes" value={s.notes ?? ''} onChangeText={(notes) => maj({ notes })} multiline />
      {children}
      {supprimer && <Bouton titre="Supprimer" icone="supprimer" variante="danger" onPress={effacer} />}
    </Ecran>
  );
}

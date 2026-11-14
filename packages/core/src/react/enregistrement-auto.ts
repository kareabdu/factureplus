import { useCallback, useEffect, useRef, useState } from "react";

export type EtatEnregistrementAuto = "inactif" | "enregistrement" | "enregistre" | "erreur";

/**
 * Enregistrement automatique (brouillons) : `enregistrer` est appelé `delai` ms après la dernière
 * modification, repérée par `signature` (état sérialisé). Jamais deux enregistrements à la fois ;
 * `attendre()` laisse finir celui en cours avant une action manuelle (validation, enregistrement),
 * `marquer(signature)` indique qu'un enregistrement manuel vient d'avoir lieu.
 */
export function useEnregistrementAuto({ actif, signature, enregistrer, delai = 1500 }: {
  actif: boolean; signature: string; enregistrer: () => Promise<void>; delai?: number;
}) {
  const [etat, setEtat] = useState<EtatEnregistrementAuto>("inactif");
  const [heure, setHeure] = useState<Date | null>(null);
  const fonction = useRef(enregistrer);
  const derniere = useRef(signature); // dernière signature enregistrée (au départ : l'état initial)
  const enCours = useRef<Promise<void> | null>(null);

  useEffect(() => {
    fonction.current = enregistrer;
  });

  const attendre = useCallback(async () => {
    while (enCours.current) await enCours.current.catch(() => undefined);
  }, []);

  const lancer = useCallback(async (sig: string) => {
    await attendre();
    if (sig === derniere.current) return;
    setEtat("enregistrement");
    const p = fonction.current();
    enCours.current = p;
    try {
      await p;
      derniere.current = sig;
      setEtat("enregistre");
      setHeure(new Date());
    } catch {
      setEtat("erreur");
    } finally {
      if (enCours.current === p) enCours.current = null;
    }
  }, [attendre]);

  useEffect(() => {
    if (!actif || signature === derniere.current) return;
    const minuterie = setTimeout(() => void lancer(signature), delai);
    return () => clearTimeout(minuterie);
  }, [actif, signature, delai, lancer]);

  const marquer = useCallback((sig: string) => {
    derniere.current = sig;
  }, []);

  return { etat, heure, attendre, marquer };
}

/** Libellé court de l'état d'un enregistrement automatique (« Brouillon enregistré à 14:32 »). */
export function libelleEnregistrementAuto(etat: EtatEnregistrementAuto, heure: Date | null): string | null {
  switch (etat) {
    case "enregistrement": return "Enregistrement du brouillon…";
    case "enregistre": return heure
      ? `Brouillon enregistré à ${heure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
      : "Brouillon enregistré";
    case "erreur": return "Brouillon non enregistré : vérifiez votre connexion.";
    default: return null;
  }
}

"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

/**
 * Charge des données asynchrones avec état de chargement, erreur et rechargement.
 * Ignore les réponses arrivées après le démontage ou une nouvelle requête.
 */
export function useDonnees<T>(charger: () => Promise<T>, deps: DependencyList) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const requete = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(charger, deps);

  const recharger = useCallback(async () => {
    const n = ++requete.current;
    setErreur(null);
    try {
      const r = await fn();
      if (n === requete.current) setDonnees(r);
    } catch (e) {
      if (n === requete.current) setErreur((e as Error).message);
    } finally {
      if (n === requete.current) setChargement(false);
    }
  }, [fn]);

  useEffect(() => {
    void recharger();
    return () => {
      requete.current++;
    };
  }, [recharger]);

  return { donnees, chargement, erreur, recharger, setDonnees };
}

import { useState, useEffect } from "react";

// Conserve la valeur de la barre de recherche entre les navigations (par
// exemple au retour d'une page de détail), via sessionStorage indexé par clé.
export default function usePersistedSearch(key) {
  const [value, setValue] = useState(() => sessionStorage.getItem(key) || "");
  useEffect(() => {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  }, [key, value]);
  return [value, setValue];
}
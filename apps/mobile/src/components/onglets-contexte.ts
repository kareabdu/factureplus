import { createContext } from 'react';

/** Vrai sous la barre d'onglets JavaScript (onglets-bas.tsx), qui ne recouvre pas le contenu, contrairement à la native. */
export const ContexteOngletsBas = createContext(false);

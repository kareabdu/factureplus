import { router } from 'expo-router';

/**
 * Écrans de sélection (scanner, choix d'un produit ou d'un client) qui renvoient une valeur
 * à l'écran appelant : l'appelant attend une promesse, l'écran choisi la résout puis se ferme.
 */

type Resolveur = (valeur: unknown) => void;
const enAttente = new Map<string, Resolveur>();

function attendre<T>(cle: string, ouvrir: () => void): Promise<T | null> {
  // Une seule attente par type : la précédente est abandonnée (null)
  enAttente.get(cle)?.(null);
  return new Promise<T | null>((resoudre) => {
    enAttente.set(cle, resoudre as Resolveur);
    ouvrir();
  });
}

/** Appelé par l'écran de sélection. `null` = abandon. Ferme l'écran. */
export function repondre(cle: string, valeur: unknown) {
  const r = enAttente.get(cle);
  enAttente.delete(cle);
  r?.(valeur);
  if (router.canGoBack()) router.back();
}

/** Abandon (écran fermé par geste) sans navigation supplémentaire. */
export function abandonner(cle: string) {
  const r = enAttente.get(cle);
  enAttente.delete(cle);
  r?.(null);
}

export type ProduitChoisi = { id: string; nom: string; unite: string; prix_vente: number; prix_achat: number; quantite: number };
export type ClientChoisi = { id: string; nom: string; telephone: string | null; adresse: string | null };
export type FournisseurChoisi = { id: string; nom: string };

/** Ouvre la caméra et renvoie le code lu (ou null). */
export const scannerCode = (titre?: string) =>
  attendre<string>('scan', () => router.push({ pathname: '/scanner', params: titre ? { titre } : {} }));

export const choisirProduit = () => attendre<ProduitChoisi>('produit', () => router.push('/choisir/produit'));
export const choisirClient = () => attendre<ClientChoisi>('client', () => router.push('/choisir/client'));
export const choisirFournisseur = () => attendre<FournisseurChoisi>('fournisseur', () => router.push('/choisir/fournisseur'));

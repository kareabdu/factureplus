import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/** Icônes de l'application : symbole SF sur iOS, Material Symbols sur Android et web. */
export const ICONES = {
  accueil: { ios: 'square.grid.2x2.fill', android: 'home' },
  produits: { ios: 'shippingbox.fill', android: 'inventory_2' },
  ventes: { ios: 'doc.text.fill', android: 'receipt_long' },
  plus: { ios: 'ellipsis.circle.fill', android: 'more_horiz' },
  ajouter: { ios: 'plus', android: 'add' },
  retirer: { ios: 'minus', android: 'remove' },
  chercher: { ios: 'magnifyingglass', android: 'search' },
  scanner: { ios: 'barcode.viewfinder', android: 'barcode_scanner' },
  alerte: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  mouvements: { ios: 'arrow.up.arrow.down', android: 'swap_vert' },
  inventaire: { ios: 'checklist', android: 'checklist' },
  achats: { ios: 'cart.fill', android: 'shopping_cart' },
  livraison: { ios: 'truck.box.fill', android: 'local_shipping' },
  client: { ios: 'person.fill', android: 'person' },
  fournisseur: { ios: 'building.2.fill', android: 'store' },
  categorie: { ios: 'tag.fill', android: 'category' },
  reglages: { ios: 'gearshape.fill', android: 'settings' },
  deconnexion: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  partager: { ios: 'square.and.arrow.up', android: 'share' },
  imprimer: { ios: 'printer.fill', android: 'print' },
  paiement: { ios: 'banknote.fill', android: 'payments' },
  supprimer: { ios: 'trash', android: 'delete' },
  modifier: { ios: 'pencil', android: 'edit' },
  valider: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  annuler: { ios: 'xmark.circle', android: 'cancel' },
  photo: { ios: 'camera.fill', android: 'photo_camera' },
  suivant: { ios: 'chevron.right', android: 'chevron_right' },
  fermer: { ios: 'xmark', android: 'close' },
  document: { ios: 'doc.plaintext', android: 'description' },
  tendance: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' },
  compte: { ios: 'person.crop.circle', android: 'person' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type NomIcone = keyof typeof ICONES;

export function Icone({ nom, taille = 22, couleur }: { nom: NomIcone; taille?: number; couleur: ColorValue }) {
  const i = ICONES[nom];
  return (
    <SymbolView
      name={{ ios: i.ios, android: i.android, web: i.android }}
      size={taille}
      tintColor={couleur}
      resizeMode="scaleAspectFit"
      style={{ width: taille, height: taille }}
    />
  );
}

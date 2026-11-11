// Helpers pour la répartition d'un article invoice sur plusieurs emplacements
// et la déduction / réinjection cohérente du stock par emplacement.

// Extrait la liste des allocations {location_id, quantity} d'un InvoiceItem.
// - Utilise item.allocations si présent (multi-emplacements).
// - Sinon retombe sur location_id + quantity (legacy mono-emplacement).
// - Si aucun emplacement renseigné mais quantité > 0, on déduit du stock global
//   (location_id null) pour préserver le comportement historique.
export function getItemAllocations(item) {
  const qty = parseFloat(item?.quantity) || 0;
  if (Array.isArray(item?.allocations) && item.allocations.length > 0) {
    return item.allocations
      .filter((a) => a && (parseFloat(a.quantity) || 0) > 0)
      .map((a) => ({ location_id: a.location_id || null, quantity: parseFloat(a.quantity) || 0 }));
  }
  if (qty > 0) return [{ location_id: item?.location_id || null, quantity: qty }];
  return [];
}

// Résout les allocations d'un article vers des emplacements réels du produit.
// Quand l'article n'a aucun emplacement assigné (location_id null) mais le
// produit possède un seul emplacement, on attribue la quantité à cet emplacement
// afin que le stock par emplacement reste cohérent avec le stock global.
export function resolveAllocations(product, item) {
  const allocs = getItemAllocations(item);
  if (allocs.length === 0) return allocs;
  if (allocs.some((a) => a.location_id)) return allocs;
  const locs = Array.isArray(product?.locations) ? product.locations.filter((l) => l && l.location_id) : [];
  if (locs.length === 1) {
    return allocs.map((a) => ({ ...a, location_id: locs[0].location_id }));
  }
  return allocs;
}

// Calcule le nouvel état du produit (quantité globale + tableau locations) après
// déduction des allocations. Ne mute pas le produit d'origine.
export function computeDeductedProduct(product, allocations) {
  const prevQty = product?.quantity || 0;
  const totalDeduct = allocations.reduce((s, a) => s + (a.quantity || 0), 0);
  const newQty = Math.max(0, prevQty - totalDeduct);
  let updatedLocations = Array.isArray(product?.locations) ? product.locations : [];
  if (allocations.some((a) => a.location_id)) {
    updatedLocations = updatedLocations.map((l) => {
      if (!l || !l.location_id) return l;
      const deduct = allocations
        .filter((a) => a.location_id === l.location_id)
        .reduce((s, a) => s + (a.quantity || 0), 0);
      if (!deduct) return l;
      return { ...l, quantity: Math.max(0, (l.quantity || 0) - deduct) };
    });
  }
  return { newQty, updatedLocations, totalDeduct };
}

// Somme des quantités d'un tableau d'allocations.
export function sumAllocations(allocations) {
  if (!Array.isArray(allocations)) return 0;
  return allocations.reduce((s, a) => s + (parseFloat(a?.quantity) || 0), 0);
}

// Construit les lignes "emplacements" à afficher sur un BL (aperçu + PDF).
// - Si l'article a des allocations explicites (multi-emplacements), on les utilise
//   avec leur quantité livrée.
// - Sinon (article mono ou sans répartition), on affiche les emplacements de
//   stockage du produit avec leur stock disponible, pour guider la préparation.
// locations = entités Location [{ id, name }]
export function buildBLDisplayRows(item, product, locations) {
  const locName = (id) => (Array.isArray(locations) ? locations.find((l) => l.id === id)?.name : null) || "Emplacement";
  const qty = parseFloat(item?.quantity) || 0;
  // Une seule ligne par article facturé (le BL reprend la facture).
  // L'emplacement est celui renseigné sur l'article (copié depuis la facture) :
  // un emplacement par ligne, à l'image de la facture.
  const explicit = Array.isArray(item?.allocations) ? item.allocations.filter((a) => a && a.location_id) : [];
  if (explicit.length) {
    const names = Array.from(new Set(explicit.map((a) => locName(a.location_id))));
    return [{ location_id: explicit[0].location_id, name: names.join(", "), qty }];
  }
  if (item?.location_id) {
    return [{ location_id: item.location_id, name: locName(item.location_id), qty }];
  }
  return [{ location_id: null, name: "—", qty }];
}

// Somme des quantités du tableau locations d'un produit.
export function sumLocationQuantities(locations) {
  if (!Array.isArray(locations)) return 0;
  return locations.reduce((s, l) => s + (parseFloat(l?.quantity) || 0), 0);
}
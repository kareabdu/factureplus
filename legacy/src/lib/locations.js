export function getLocationEntries(product) {
  if (!product) return [];
  if (Array.isArray(product.locations) && product.locations.length) {
    return product.locations.filter((e) => e && e.location_id);
  }
  if (Array.isArray(product.location_ids) && product.location_ids.length) {
    return product.location_ids.map((id) => ({ location_id: id, quantity: 0 }));
  }
  return [];
}

export function hasLocation(product, locationId, locations = []) {
  if (getLocationEntries(product).some((e) => e.location_id === locationId)) return true;
  // Fallback : ancien champ texte `location` (legacy) matché par nom
  const loc = locations.find((l) => l.id === locationId);
  if (loc && product.location && product.location.trim().toLowerCase() === loc.name.trim().toLowerCase()) return true;
  return false;
}

export function getLocationStock(product, locations = []) {
  return getLocationEntries(product).map((e) => {
    const loc = locations.find((l) => l.id === e.location_id);
    return { id: e.location_id, name: loc?.name || "—", quantity: e.quantity ?? 0 };
  });
}

export function getLocationNames(product, locations = []) {
  const stock = getLocationStock(product, locations);
  if (stock.length) return stock.map((l) => l.name).join(", ");
  return product.location || "";
}

// Distribue une quantité totale sur les emplacements sélectionnés.
// "Stock actuel" est le boss : il pilote les quantités par emplacement,
// jamais l'inverse. 1 emplacement = quantité complète ; plusieurs =
// répartition proportionnelle aux quantités actuelles (ou tout sur le
// premier si tout est à zéro).
export function distributeQuantityToLocations(entries, totalQty) {
  if (!Array.isArray(entries) || entries.length === 0) return entries;
  const total = Math.max(0, Number(totalQty) || 0);
  if (entries.length === 1) {
    return [{ ...entries[0], quantity: total }];
  }
  const currentSum = entries.reduce((s, e) => s + (Number(e.quantity) || 0), 0);
  if (currentSum === 0) {
    return entries.map((e, i) => ({ ...e, quantity: i === 0 ? total : 0 }));
  }
  let remaining = total;
  return entries.map((e, i) => {
    if (i === entries.length - 1) {
      const qty = Math.max(0, remaining);
      remaining = 0;
      return { ...e, quantity: qty };
    }
    const ratio = (Number(e.quantity) || 0) / currentSum;
    const qty = Math.round(total * ratio);
    remaining -= qty;
    return { ...e, quantity: Math.max(0, qty) };
  });
}

export function sumLocationStock(entries) {
  if (!Array.isArray(entries)) return 0;
  return entries
    .filter((e) => e && e.location_id)
    .reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
}

export function getLocationStockLabel(product, locations = []) {
  const stock = getLocationStock(product, locations);
  if (stock.length) return stock.map((l) => `${l.name} (${l.quantity})`).join(", ");
  return product.location || "";
}
// Store léger des IDs produits actuellement affichés à l'écran (page Articles).
// La cloche de notifications s'y abonne pour ne signaler que les alertes
// concernant les articles visibles.
let currentIds = [];
const EMPTY = [];
const listeners = new Set();

export function setVisibleProductIds(ids) {
  currentIds = Array.isArray(ids) ? ids : [];
  listeners.forEach((l) => l());
}

export function getVisibleProductIds() {
  return currentIds.length ? currentIds : EMPTY;
}

export function subscribeVisibleProductIds(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
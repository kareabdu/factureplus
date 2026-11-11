import { Product } from "@/entities/all";

// Cache en mémoire de la liste des produits (TTL 30s). Évite de recharger
// tout le catalogue à chaque ouverture de l'éditeur d'article / de facture.
const TTL = 30_000;
let _cache = null; // { data, ts }

export async function getProducts(force = false) {
  const now = Date.now();
  if (!force && _cache && now - _cache.ts < TTL) {
    return _cache.data;
  }
  const data = await Product.list('-updated_date', 1000);
  _cache = { data, ts: now };
  return data;
}

export function invalidateProducts() {
  _cache = null;
}

export function upsertProductInCache(product) {
  if (!_cache) return;
  const idx = _cache.data.findIndex((p) => p.id === product.id);
  if (idx >= 0) _cache.data[idx] = product;
  else _cache.data.unshift(product);
}

export function removeProductFromCache(id) {
  if (!_cache) return;
  _cache.data = _cache.data.filter((p) => p.id !== id);
}
import { Customer } from "@/entities/all";

// Cache en mémoire de la liste des clients pour éviter un aller-retour à
// chaque ouverture de ClientPicker / Customers. TTL court (60s) pour rester
// à jour sans recharger systématiquement.
const TTL = 60_000;
let _cache = null; // { data, ts }

export async function getCustomers(force = false) {
  const now = Date.now();
  if (!force && _cache && now - _cache.ts < TTL) {
    return _cache.data;
  }
  const data = await Customer.list();
  _cache = { data, ts: now };
  return data;
}

export function peekCustomers() {
  return _cache?.data ?? null;
}

export function invalidateCustomers() {
  _cache = null;
}

// Ajoute/maj un client dans le cache sans recharger (après création/édition).
export function upsertCustomerInCache(customer) {
  if (!_cache) return;
  const idx = _cache.data.findIndex((c) => c.id === customer.id);
  if (idx >= 0) {
    _cache.data[idx] = customer;
  } else {
    _cache.data.unshift(customer);
  }
}
import { Invoice } from "@/entities/all";

// Cache en mémoire des documents (factures / devis / bons), indexé par type.
// TTL court (30s) : au retour sur une liste on affiche immédiatement les
// données en cache (pas d'écran blanc), puis on rafraîchit en arrière-plan.
const TTL = 30_000;
const _cache = {}; // { [type]: { data, ts } }

export async function getInvoices(type, force = false) {
  const now = Date.now();
  const entry = _cache[type];
  if (!force && entry && now - entry.ts < TTL) {
    return entry.data;
  }
  const page = await Invoice.filter({ type }, { sort: "-created_date", limit: 100 });
  const data = page?.items ?? page ?? [];
  _cache[type] = { data, ts: now };
  return data;
}

// Renvoie les données en cache sans déclencher de requête (pour affichage
// instantané au retour d'une page de détail).
export function peekInvoices(type) {
  return _cache[type]?.data ?? null;
}

export function invalidateInvoices(type) {
  if (type) delete _cache[type];
  else for (const k of Object.keys(_cache)) delete _cache[k];
}

export function upsertInvoiceInCache(type, invoice) {
  const entry = _cache[type];
  if (!entry) return;
  const idx = entry.data.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) entry.data[idx] = invoice;
  else entry.data.unshift(invoice);
}

export function removeInvoiceFromCache(type, id) {
  const entry = _cache[type];
  if (!entry) return;
  entry.data = entry.data.filter((i) => i.id !== id);
}
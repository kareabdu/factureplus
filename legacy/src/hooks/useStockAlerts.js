import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { StockAlert, Product } from "@/entities/all";
import { getVisibleProductIds, subscribeVisibleProductIds } from "@/lib/visibleProducts";

const EMPTY = [];

/**
 * Charge les alertes de stock actives et se met à jour en temps réel.
 * - Filtre les alertes dont le produit n'existe plus.
 * - Ne conserve qu'une seule alerte par produit (la plus récente).
 * - Restreint aux produits actuellement affichés à l'écran (Articles).
 */
export function useStockAlerts() {
  const visibleIds = useSyncExternalStore(
    subscribeVisibleProductIds,
    getVisibleProductIds,
    () => EMPTY
  );
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [data, products] = await Promise.all([
        StockAlert.filter({ status: "active" }),
        Product.list(),
      ]);
      const existingIds = new Set((products || []).map((p) => p.id));
      // On ne garde que les alertes dont le produit existe encore,
      // et une seule alerte par produit (la plus récente).
      const byProduct = new Map();
      for (const a of data || []) {
        if (!existingIds.has(a.product_id)) continue;
        const prev = byProduct.get(a.product_id);
        if (!prev || (a.updated_date || "") > (prev.updated_date || "")) {
          byProduct.set(a.product_id, a);
        }
      }
      setAlerts(Array.from(byProduct.values()));
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = StockAlert.subscribe(() => { load(); });
    return unsub;
  }, [load]);

  const visibleSet = new Set(visibleIds);
  const scoped =
    visibleSet.size > 0 ? alerts.filter((a) => visibleSet.has(a.product_id)) : alerts;
  const outOfStock = scoped.filter((a) => (a.quantity ?? 0) <= 0);
  const lowStock = scoped.filter(
    (a) => (a.quantity ?? 0) > 0 && (a.quantity ?? 0) <= (a.reorder_level ?? 0)
  );
  return { alerts: scoped, outOfStock, lowStock, total: scoped.length, loading, refresh: load };
}
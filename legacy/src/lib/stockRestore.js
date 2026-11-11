import { Product, StockMovement } from "@/entities/all";
import { syncStockAlert } from "@/lib/stockAlerts";

// Réinjecte le stock déduit sur une facture (suppression de facture).
//
// Calcule le net à réinjecter = somme(out) - somme(in) par (produit, emplacement).
// Les mouvements "in" (réinjection déjà effectuée lors d'une suppression d'article
// ou d'une réduction de quantité) sont déduits pour éviter toute double réinjection.
//
// @param {string} reference - invoice_number du document (réf. des mouvements)
// @returns {Promise<{ restored: Array }>}
export async function restoreStockByReference(reference) {
  if (!reference) return { restored: [] };
  const movements = await StockMovement.filter({ reference });
  if (movements.length === 0) return { restored: [] };

  // Agrège par (produit, emplacement) pour réinjecter au bon endroit.
  const byProduct = {}; // pid -> { netRestore, byLocation: { locId -> netRestore } }
  for (const m of movements) {
    const pid = m.product_id;
    if (!pid) continue;
    const q = Number(m.quantity) || 0;
    const isOut = m.movement_type === "out";
    const isIn = m.movement_type === "in";
    if (!isOut && !isIn) continue;
    if (!byProduct[pid]) byProduct[pid] = { netRestore: 0, byLocation: {} };
    const signed = isOut ? q : -q;
    byProduct[pid].netRestore += signed;
    if (m.location_id) {
      byProduct[pid].byLocation[m.location_id] = (byProduct[pid].byLocation[m.location_id] || 0) + signed;
    }
  }

  const restored = [];
  for (const pid of Object.keys(byProduct)) {
    const info = byProduct[pid];
    if (info.netRestore === 0) continue;
    const list = await Product.filter({ id: pid });
    const p = list[0];
    if (!p) continue;
    const newQty = Math.max(0, (p.quantity || 0) + info.netRestore);
    let updatedLocations = Array.isArray(p.locations) ? p.locations : [];
    if (Object.keys(info.byLocation).length > 0) {
      updatedLocations = updatedLocations.map((l) => {
        if (!l || !l.location_id || !(l.location_id in info.byLocation)) return l;
        return { ...l, quantity: Math.max(0, (l.quantity || 0) + info.byLocation[l.location_id]) };
      });
    }
    await Product.update(pid, { quantity: newQty, locations: updatedLocations });
    syncStockAlert({ ...p, quantity: newQty });
    restored.push({ product_id: pid, restored: info.netRestore, new_quantity: newQty });
  }

  for (const m of movements) { try { await StockMovement.delete(m.id); } catch { /* ignore */ } }
  return { restored };
}
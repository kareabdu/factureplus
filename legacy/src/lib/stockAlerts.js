import { StockAlert } from "@/entities/all";

/**
 * Synchronise l'alerte de stock d'un produit après un mouvement.
 * - Crée une alerte active si qty <= seuil (stock bas / rupture).
 * - Met à jour la quantité si l'alerte existe déjà.
 * - Résout l'alerte si le stock repasse au-dessus du seuil.
 *
 * @param {object} product — produit avec quantity + reorder_level à jour
 */
export async function syncStockAlert(product) {
  if (!product?.id) return;
  const qty = product.quantity ?? 0;
  const threshold = product.reorder_level ?? 0;
  const isLow = qty <= threshold;
  try {
    const existing = await StockAlert.filter({ product_id: product.id, status: "active" });
    if (isLow) {
      if (!existing.length) {
        await StockAlert.create({
          product_id: product.id,
          product_name: product.name,
          quantity: qty,
          reorder_level: threshold,
          status: "active",
          notified: false,
          team_id: product.team_id || null,
        });
      } else {
        const a = existing[0];
        if (a.quantity !== qty || a.reorder_level !== threshold) {
          await StockAlert.update(a.id, { quantity: qty, reorder_level: threshold });
        }
      }
    } else if (existing.length) {
      await StockAlert.update(existing[0].id, { status: "resolved" });
    }
  } catch {
    // silencieux : la notification n'est pas bloquante
  }
}
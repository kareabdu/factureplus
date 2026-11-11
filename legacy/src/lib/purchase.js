import { base44 } from "@/api/base44Client";
import { createStockMovement } from "@/lib/stockMovement";
import { getTeamId } from "@/lib/team";
import { logActivity } from "@/lib/activity";

export function purchaseReference() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(2, 14);
  return `ACH-${stamp}`;
}

export function lineTotal(item) {
  return (Number(item?.quantity) || 0) * (Number(item?.unit_price) || 0);
}

export function itemsTotal(items = []) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

/**
 * Enregistre un achat : crée la trace d'achat, entre les articles en stock
 * et met à jour le prix de revient de chaque produit.
 */
export async function confirmPurchase({ supplier, items, paymentMethod, paidAmount, notes }) {
  const teamId = await getTeamId();
  const reference = purchaseReference();
  const total = itemsTotal(items);

  const purchase = await base44.entities.Purchase.create({
    reference,
    date: new Date().toISOString().slice(0, 10),
    supplier_id: supplier?.id || "",
    supplier_name: supplier?.name || "",
    items: items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      unit: item.unit || "",
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total: lineTotal(item),
    })),
    total_amount: total,
    payment_method: paymentMethod,
    paid_amount: Number(paidAmount) || 0,
    notes: notes || "",
    status: "received",
    team_id: teamId,
  });

  for (const item of items) {
    if (!item.product) continue;
    await createStockMovement(item.product, {
      movement_type: "in",
      quantity: Number(item.quantity) || 0,
      reason: "Achat / réapprovisionnement",
      reference,
      location_id: null,
    });
    const cost = Number(item.unit_price) || 0;
    if (cost > 0 && cost !== Number(item.product.cost_price || 0)) {
      await base44.entities.Product.update(item.product_id, { cost_price: cost });
    }
  }

  logActivity({
    action_type: "create",
    entity_type: "purchase",
    entity_id: purchase.id,
    description: `Achat ${reference} — ${items.length} article(s)`,
    metadata: { reference, total },
  });

  return purchase;
}
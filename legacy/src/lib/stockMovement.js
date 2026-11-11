import { Product, StockMovement } from "@/entities/all";
import { getTeamId } from "@/lib/team";
import { getUserName, logActivity } from "@/lib/activity";
import { syncStockAlert } from "@/lib/stockAlerts";

/**
 * Crée un mouvement de stock (entrée / sortie / ajustement) et met à jour
 * la quantité du produit — au niveau global et par emplacement.
 *
 * @param {object} product  — entité Product complète (avec .locations)
 * @param {object} data     — { movement_type, quantity, reason, reference, location_id }
 * @returns {Promise<{ newQuantity: number, updatedLocations: array }>}
 */
export async function createStockMovement(product, data) {
  const qty = parseFloat(data.quantity);
  if (!qty || qty < 0) throw new Error("Quantité invalide");

  let newQuantity = product.quantity ?? 0;
  if (data.movement_type === "in") newQuantity += qty;
  else if (data.movement_type === "out") newQuantity = Math.max(0, (product.quantity ?? 0) - qty);
  else newQuantity = qty; // adjustment → remplace

  let updatedLocations = Array.isArray(product.locations) ? product.locations : [];
  if (data.location_id && updatedLocations.length > 0) {
    if (data.movement_type === "in") {
      updatedLocations = updatedLocations.map((l) =>
        l && l.location_id === data.location_id
          ? { ...l, quantity: (l.quantity || 0) + qty }
          : l
      );
    } else if (data.movement_type === "out") {
      updatedLocations = updatedLocations.map((l) =>
        l && l.location_id === data.location_id
          ? { ...l, quantity: Math.max(0, (l.quantity || 0) - qty) }
          : l
      );
    } else {
      // adjustment sur un emplacement précis
      updatedLocations = updatedLocations.map((l) =>
        l && l.location_id === data.location_id
          ? { ...l, quantity: qty }
          : l
      );
    }
  }

  await StockMovement.create({
    product_id: product.id,
    product_name: product.name,
    movement_type: data.movement_type,
    quantity: qty,
    previous_quantity: product.quantity ?? 0,
    new_quantity: newQuantity,
    location_id: data.location_id || null,
    reason: data.reason,
    reference: data.reference,
    user_name: await getUserName(),
    team_id: await getTeamId(),
  });

  await Product.update(product.id, { quantity: newQuantity, locations: updatedLocations });

  const label =
    data.movement_type === "in" ? "Entrée"
    : data.movement_type === "out" ? "Sortie"
    : "Ajustement";

  logActivity({
    action_type: "update",
    entity_type: "stock",
    entity_id: product.id,
    description: `${label} de ${qty} — ${product.name}`,
    metadata: { movement_type: data.movement_type, quantity: qty },
  });

  // Synchronise l'alerte de stock (côté client, sans consommation de crédit)
  syncStockAlert({ ...product, quantity: newQuantity, locations: updatedLocations });

  return { newQuantity, updatedLocations };
}
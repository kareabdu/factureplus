import { LivreurStock, Product } from "@/entities/all";
import { getTeamId } from "@/lib/team";

// Ajuste le stock du produit (page Stock) du delta confié au livreur.
// delta positif = on confie davantage → on déduit du stock produit.
// delta négatif = on reprend du stock → on réincrémente le stock produit.
// Déduit aussi de l'emplacement d'origine si précisé. Le stock ne descend
// jamais sous zéro (global et par emplacement).
export async function adjustProductStockForLivreur(productId, delta, locationId) {
  if (!productId || !delta) return;
  try {
    const fresh = await Product.get(productId);
    const current = parseFloat(fresh.quantity) || 0;
    let next = current - delta;
    if (next < 0) next = 0;
    let updatedLocations = Array.isArray(fresh.locations) ? fresh.locations : [];
    if (locationId && updatedLocations.length) {
      updatedLocations = updatedLocations.map((l) =>
        l && l.location_id === locationId
          ? { ...l, quantity: Math.max(0, (parseFloat(l.quantity) || 0) - delta) }
          : l
      );
    }
    await Product.update(productId, { quantity: next, locations: updatedLocations });
  } catch {}
}

// Récupère le stock d'un livreur (tous les produits confiés).
export async function getLivreurStock(livreurId) {
  if (!livreurId) return [];
  const rows = await LivreurStock.filter({ livreur_id: livreurId });
  return rows;
}

// Récupère (ou crée) la ligne de stock pour un produit donné chez un livreur.
async function ensureRow(livreurId, product, teamId) {
  const existing = await LivreurStock.filter({ livreur_id: livreurId, product_id: product.id });
  if (existing.length) return existing[0];
  const created = await LivreurStock.create({
    livreur_id: livreurId,
    product_id: product.id,
    product_name: product.name,
    quantity: 0,
    initial_quantity: 0,
    unit: product.unit || "Pcs",
    team_id: teamId,
  });
  return created;
}

// Initialise / réinitialise le stock initial d'un livreur pour une liste de
// produits. Met à jour initial_quantity ET quantity (le stock courant repart
// du stock initial). Crée les lignes manquantes.
export async function setLivreurInitialStock(livreurId, entries, products) {
  const teamId = await getTeamId();
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const e of entries) {
    const product = byId.get(e.product_id) || { id: e.product_id, name: e.product_name, unit: e.unit };
    const row = await ensureRow(livreurId, product, teamId);
    const qty = parseFloat(e.initial_quantity) || 0;
    await LivreurStock.update(row.id, {
      initial_quantity: qty,
      quantity: qty,
      product_name: product.name,
      unit: product.unit || row.unit || "Pcs",
    });
  }
}

// Ajoute une entrée de stock (produit + quantité initiale) pour un livreur.
export async function addLivreurStockEntry(livreurId, product, initialQty, locationId, locationName) {
  const teamId = await getTeamId();
  const row = await ensureRow(livreurId, product, teamId);
  const qty = parseFloat(initialQty) || 0;
  const prevInitial = parseFloat(row.initial_quantity) || 0;
  await LivreurStock.update(row.id, {
    initial_quantity: qty,
    quantity: qty,
    product_name: product.name,
    unit: product.unit || row.unit || "Pcs",
    location_id: locationId || null,
    location_name: locationName || "",
  });
  // Déduit du stock produit (et de l'emplacement d'origine) le delta confié.
  await adjustProductStockForLivreur(product.id, qty - prevInitial, locationId);
  return row;
}

// Réapprovisionne une ligne de stock livreur : ajoute une quantité au stock
// courant ET au stock initial (préserve les livraisons déjà déduites), et
// déduit cette quantité du stock produit (et de l'emplacement d'origine).
export async function reapprovisionnerLivreur(row, qty) {
  const add = parseFloat(qty) || 0;
  if (!add || !row) return;
  await LivreurStock.update(row.id, {
    initial_quantity: (row.initial_quantity || 0) + add,
    quantity: (row.quantity || 0) + add,
  });
  await adjustProductStockForLivreur(row.product_id, add, row.location_id);
}

// Déduit les articles livrés du stock du livreur. items = lignes InvoiceItem.
// Ne déduit que les produits pour lesquels une ligne de stock existe ; sinon
// crée une ligne négative pour tracer l'écart (le livreur a livré sans stock
// initial connu).
export async function deductLivreurStock(livreurId, items, livreurName) {
  if (!livreurId || !items || !items.length) return [];
  const teamId = await getTeamId();
  const rows = await LivreurStock.filter({ livreur_id: livreurId });
  const byProduct = new Map(rows.map((r) => [r.product_id, r]));
  const movements = [];
  for (const it of items) {
    if (!it.product_id) continue;
    const qty = parseFloat(it.quantity) || 0;
    if (qty <= 0) continue;
    let row = byProduct.get(it.product_id);
    if (!row) {
      row = await LivreurStock.create({
        livreur_id: livreurId,
        livreur_name: livreurName || "",
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: 0,
        initial_quantity: 0,
        unit: it.unit || "Pcs",
        team_id: teamId,
      });
      byProduct.set(it.product_id, row);
    }
    const newQty = (row.quantity || 0) - qty;
    await LivreurStock.update(row.id, { quantity: newQty, livreur_name: livreurName || row.livreur_name });
    movements.push({ product_name: it.product_name, qty, newQty });
  }
  return movements;
}

// Vérifie la disponibilité du stock livreur pour une liste d'articles.
// Retourne la liste des articles insuffisants (libellé "nom (dispo: X)").
export async function checkLivreurStock(livreurId, items) {
  if (!livreurId || !items || !items.length) return [];
  const rows = await LivreurStock.filter({ livreur_id: livreurId });
  const byProduct = new Map(rows.map((r) => [r.product_id, r]));
  const missing = [];
  for (const it of items) {
    if (!it.product_id) continue;
    const dispo = byProduct.get(it.product_id)?.quantity ?? 0;
    if (dispo < (parseFloat(it.quantity) || 0)) missing.push(`${it.product_name} (dispo: ${dispo})`);
  }
  return missing;
}

// Applique la comptabilité de stock lors d'un changement d'état d'un BL.
// - vers "sent" (livré) : déduit le stock livreur.
// - depuis "sent" vers autre : rembourse le stock livreur.
export async function applyBLStatusChange(prevStatus, targetStatus, livreurId, items, livreurName) {
  if (!livreurId || !items || !items.length) return;
  if (prevStatus === targetStatus) return;
  if (targetStatus === "sent" && prevStatus !== "sent") {
    await deductLivreurStock(livreurId, items, livreurName);
  } else if (targetStatus !== "sent" && prevStatus === "sent") {
    await refundLivreurStock(livreurId, items);
  }
}

// Rembourse le stock d'un livreur (en cas d'annulation d'une livraison déjà
// déduite). Réincrémente les quantités livrées.
export async function refundLivreurStock(livreurId, items) {
  if (!livreurId || !items || !items.length) return;
  const rows = await LivreurStock.filter({ livreur_id: livreurId });
  const byProduct = new Map(rows.map((r) => [r.product_id, r]));
  for (const it of items) {
    if (!it.product_id) continue;
    const qty = parseFloat(it.quantity) || 0;
    if (qty <= 0) continue;
    const row = byProduct.get(it.product_id);
    if (!row) continue;
    await LivreurStock.update(row.id, { quantity: (row.quantity || 0) + qty });
  }
}
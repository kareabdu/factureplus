// Synchronisation idempotente du stock d'une facture (déduction / réinjection).
//
// Principe : les articles d'une facture définissent le stock à déduire. Pour
// chaque (produit, emplacement) on calcule :
//   delta = quantité requise (allocations des articles) - net déjà déduit (out - in)
// et on crée les mouvements manquants (out si delta > 0, in si delta < 0).
// Les mouvements existants sont pris en compte → aucune double déduction,
// même si la synchro est déclenchée plusieurs fois.

import { Product, StockMovement, Invoice } from "@/entities/all";
import { getTeamId } from "@/lib/team";
import { getUserName } from "@/lib/activity";
import { syncStockAlert } from "@/lib/stockAlerts";
import { resolveAllocations } from "@/lib/stockAllocations";

// Empreinte des articles d'une facture (détection de changements).
// Inclut produit, quantité et allocations (emplacements) — toute modification
// d'un article change la clé et déclenche un rapprochement.
export function itemsStockKey(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((it) => `${it.product_id || ""}#${it.id || ""}#${it.quantity || 0}#${JSON.stringify(it.allocations || [])}#${it.location_id || ""}`)
    .join("|");
}

/**
 * Rapproche le stock déduit avec les articles d'une facture (idempotent).
 *
 * @param {object} opts
 * @param {string} opts.invoiceId       — id de la facture (persiste stock_deducted)
 * @param {string} opts.invoiceNumber   — n° de facture (réf. des mouvements)
 * @param {array}  opts.items           — articles InvoiceItem de la facture
 * @param {array}  [opts.products]      — produits déjà chargés (cache, optionnel)
 * @param {string} [opts.reason]        — raison du mouvement (défaut "Facture")
 * @param {boolean} [opts.persistFlag]  — persiste stock_deducted=true (défaut true)
 */
export async function syncInvoiceStock({ invoiceId, invoiceNumber, items, products = [], reason = "Facture", persistFlag = true }) {
  if (!invoiceNumber) return; // sans n° de facture, on ne déduit pas (évite ref="")

  const [existingOut, existingIn, teamId, userName] = await Promise.all([
    StockMovement.filter({ reference: invoiceNumber, movement_type: "out" }),
    StockMovement.filter({ reference: invoiceNumber, movement_type: "in" }),
    getTeamId(),
    getUserName(),
  ]);

  const keyOf = (pid, loc) => `${pid}||${loc || ""}`;
  // Net déjà déduit par (produit, emplacement) = somme(out) - somme(in)
  const netMap = new Map();
  const ensureNet = (pid, loc) => {
    const k = keyOf(pid, loc);
    if (!netMap.has(k)) netMap.set(k, { pid, loc: loc || "", net: 0 });
    return netMap.get(k);
  };
  for (const m of existingOut) { if (!m.product_id) continue; ensureNet(m.product_id, m.location_id).net += (m.quantity || 0); }
  for (const m of existingIn) { if (!m.product_id) continue; ensureNet(m.product_id, m.location_id).net -= (m.quantity || 0); }

  // Cache produits : réutilise les produits déjà chargés par l'éditeur.
  const productCache = {};
  const productName = {};
  for (const p of products) { productCache[p.id] = p; productName[p.id] = p.name; }

  const itemPids = Array.from(new Set(items.filter((it) => it.product_id).map((it) => it.product_id)));
  const movementPids = Array.from(netMap.values()).map((v) => v.pid).filter(Boolean);
  const allPids = Array.from(new Set([...itemPids, ...movementPids]));
  const missingPids = allPids.filter((pid) => !productCache[pid]);
  if (missingPids.length) {
    await Promise.all(missingPids.map(async (pid) => {
      const l = await Product.filter({ id: pid });
      productCache[pid] = l[0];
      if (l[0]) productName[pid] = l[0].name;
    }));
  }

  // Quantité requise par (produit, emplacement) d'après les allocations des articles
  const requiredMap = new Map();
  for (const it of items) {
    if (!it.product_id) continue;
    productName[it.product_id] = it.product_name || productName[it.product_id];
    for (const a of resolveAllocations(productCache[it.product_id], it)) {
      const k = keyOf(it.product_id, a.location_id);
      if (!requiredMap.has(k)) requiredMap.set(k, { pid: it.product_id, loc: a.location_id || "", qty: 0 });
      requiredMap.get(k).qty += (a.quantity || 0);
    }
  }

  // Deltas par (produit, emplacement) — requis - déjà déduit
  const allKeys = new Set([...requiredMap.keys(), ...netMap.keys()]);
  const deltas = [];
  for (const k of allKeys) {
    const req = requiredMap.get(k)?.qty || 0;
    const net = netMap.get(k)?.net || 0;
    const delta = req - net;
    if (delta !== 0) {
      const ref2 = requiredMap.get(k) || netMap.get(k);
      deltas.push({ pid: ref2.pid, loc: ref2.loc, delta });
    }
  }

  const markDeducted = async () => {
    if (persistFlag && invoiceId) { try { await Invoice.update(invoiceId, { stock_deducted: true }); } catch { /* ignore */ } }
  };

  if (deltas.length === 0) { await markDeducted(); return; }

  // Regroupement par produit pour une seule mise à jour (quantité + emplacements)
  const byPid = {};
  for (const d of deltas) {
    if (!byPid[d.pid]) byPid[d.pid] = { deltas: [], name: productName[d.pid] };
    byPid[d.pid].deltas.push(d);
  }
  const prods = Object.keys(byPid).map((pid) => productCache[pid]);
  await Promise.all(
    Object.entries(byPid).map(async ([pid, info], i) => {
      const p = prods[i];
      if (!p) return;
      const previousQty = p.quantity || 0;
      let newQty = previousQty;
      let updatedLocations = Array.isArray(p.locations) ? p.locations : [];
      for (const d of info.deltas) {
        const name = info.name || p.name;
        if (d.delta > 0) {
          // Déduction manquante
          newQty = Math.max(0, newQty - d.delta);
          if (d.loc) updatedLocations = updatedLocations.map((l) => (l && l.location_id === d.loc ? { ...l, quantity: Math.max(0, (l.quantity || 0) - d.delta) } : l));
          await StockMovement.create({ product_id: pid, product_name: name, movement_type: "out", quantity: d.delta, previous_quantity: previousQty, new_quantity: newQty, location_id: d.loc || null, reason: reason || "Facture", reference: invoiceNumber, team_id: teamId, user_name: userName });
        } else {
          // Réinjection d'un surplus déduit (réduction de quantité / suppression article)
          const qty = -d.delta;
          newQty = newQty + qty;
          if (d.loc) updatedLocations = updatedLocations.map((l) => (l && l.location_id === d.loc ? { ...l, quantity: (l.quantity || 0) + qty } : l));
          await StockMovement.create({ product_id: pid, product_name: name, movement_type: "in", quantity: qty, previous_quantity: previousQty, new_quantity: newQty, location_id: d.loc || null, reason: "Ajustement quantité / suppression article", reference: invoiceNumber, team_id: teamId, user_name: userName });
        }
      }
      await Product.update(pid, { quantity: newQty, locations: updatedLocations });
      syncStockAlert({ ...p, quantity: newQty });
    })
  );
  await markDeducted();
}
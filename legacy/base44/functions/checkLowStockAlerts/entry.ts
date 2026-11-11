import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // Admin uniquement : empêche tout appel anonyme de lister / modifier
    // les données de stock de l'ensemble des locataires.
    let user;
    try { user = await base44.auth.me(); } catch { /* non authentifié */ }
    if (!user || user.role !== "admin") return Response.json({ error: "Unauthorized" }, { status: 401 });

    const products = await sr.entities.Product.list("-created_date", 500);
    const activeAlerts = await sr.entities.StockAlert.filter({ status: "active" });

    const activeByProduct = new Map();
    for (const a of (activeAlerts || [])) activeByProduct.set(a.product_id, a);

    const newAlerts = [];
    let resolved = 0;
    let created = 0;

    for (const p of (products || [])) {
      const qty = p.quantity || 0;
      const threshold = p.reorder_level || 0;
      const isLow = qty <= threshold;
      const existing = activeByProduct.get(p.id);

      if (isLow) {
        if (!existing) {
          const alert = await sr.entities.StockAlert.create({
            product_id: p.id,
            product_name: p.name,
            quantity: qty,
            reorder_level: threshold,
            status: "active",
            notified: false,
            team_id: p.team_id || null,
          });
          newAlerts.push({ alert, product: p });
          created++;
        } else if (existing.quantity !== qty || existing.reorder_level !== threshold) {
          await sr.entities.StockAlert.update(existing.id, { quantity: qty, reorder_level: threshold });
        }
      } else if (existing) {
        await sr.entities.StockAlert.update(existing.id, { status: "resolved" });
        resolved++;
      }
    }

    return Response.json({ created, resolved, new_alerts: newAlerts.length });
  } catch (error) {
    console.error("checkLowStockAlerts error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
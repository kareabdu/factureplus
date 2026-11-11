import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id;
    if (targetUserId && user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const query = targetUserId ? { created_by_id: targetUserId } : null;

    const [products, categories, locations] = await Promise.all([
      query
        ? sr.entities.Product.filter(query, '-updated_date', 10000)
        : base44.entities.Product.list('-updated_date', 10000),
      query ? sr.entities.Category.filter(query) : base44.entities.Category.list(),
      query ? sr.entities.Location.filter(query) : base44.entities.Location.list(),
    ]);

    const catMap = {};
    (categories || []).forEach((c) => { catMap[c.id] = c.name; });
    const locMap = {};
    (locations || []).forEach((l) => { locMap[l.id] = l.name; });

    const baseRow = (p, emplacement, qteLoc) => ({
      Nom: p.name || '',
      Référence: p.sku || '',
      'Code-barres': p.barcode || '',
      Catégorie: p.category_id ? (catMap[p.category_id] || '') : '',
      Emplacement: emplacement,
      'Quantité emplacement': qteLoc,
      'Quantité totale': p.quantity ?? 0,
      'Prix de vente': p.unit_price ?? 0,
      "Prix d'achat": p.cost_price ?? 0,
      Unité: p.unit || 'Pcs',
      'Seuil réappro': p.reorder_level ?? 10,
      Fournisseur: p.supplier || '',
      Description: p.description || '',
    });

    const rows = [];
    for (const p of (products || [])) {
      const locs = Array.isArray(p.locations) ? p.locations.filter((e) => e && e.location_id) : [];
      if (locs.length === 0) {
        rows.push(baseRow(p, '', p.quantity ?? 0));
      } else {
        for (const e of locs) {
          rows.push(baseRow(p, locMap[e.location_id] || e.location_id, e.quantity ?? 0));
        }
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Articles');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = new Uint8Array(out);

    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return Response.json({ base64: btoa(binary), filename: 'articles.xlsx' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
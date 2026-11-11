import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as XLSX from 'npm:xlsx@0.18.5';

const TYPE_LABELS = { in: 'Entrée', out: 'Sortie', adjustment: 'Ajustement' };

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

    const [movements, locations] = await Promise.all([
      query
        ? sr.entities.StockMovement.filter(query, '-created_date', 20000)
        : base44.entities.StockMovement.list('-created_date', 20000),
      query ? sr.entities.Location.filter(query) : base44.entities.Location.list(),
    ]);

    const locMap = {};
    (locations || []).forEach((l) => { locMap[l.id] = l.name; });

    const rows = (movements || []).map((m) => ({
      'Date': m.created_date ? new Date(m.created_date).toLocaleDateString('fr-FR') : '',
      'Produit': m.product_name || '',
      'Type': TYPE_LABELS[m.movement_type] || m.movement_type || '',
      'Quantité': m.quantity ?? 0,
      'Stock précédent': m.previous_quantity ?? 0,
      'Nouveau stock': m.new_quantity ?? 0,
      'Emplacement': m.location_id ? (locMap[m.location_id] || m.location_id) : '',
      'Raison': m.reason || '',
      'Référence': m.reference || '',
      'Auteur': m.user_name || '',
      'Notes': m.notes || '',
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), 'Mouvements');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = new Uint8Array(out);

    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return Response.json({ base64: btoa(binary), filename: 'mouvements_stock.xlsx' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
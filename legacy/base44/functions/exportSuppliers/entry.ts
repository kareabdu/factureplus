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

    const suppliers = query
      ? await sr.entities.Supplier.filter(query, '-updated_date', 10000)
      : await base44.entities.Supplier.list('-updated_date', 10000);

    const rows = (suppliers || []).map((s) => ({
      'Nom': s.name || '',
      'Téléphone': s.phone || '',
      'Email': s.email || '',
      'Adresse': s.address || '',
      'Contact': s.contact_person || '',
      'Notes': s.notes || '',
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), 'Fournisseurs');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = new Uint8Array(out);

    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return Response.json({ base64: btoa(binary), filename: 'fournisseurs.xlsx' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
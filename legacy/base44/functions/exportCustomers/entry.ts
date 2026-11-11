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

    const [customers, deposits] = await Promise.all([
      query
        ? sr.entities.Customer.filter(query, '-updated_date', 10000)
        : base44.entities.Customer.list('-updated_date', 10000),
      query
        ? sr.entities.ClientDeposit.filter(query, '-updated_date', 50000)
        : base44.entities.ClientDeposit.list('-updated_date', 50000),
    ]);

    const depByCustomer = {};
    (deposits || []).forEach((d) => {
      if (!d.customer_id) return;
      (depByCustomer[d.customer_id] ||= []).push(d);
    });

    const rows = (customers || []).map((c) => {
      const deps = depByCustomer[c.id] || [];
      const totalActive = deps
        .filter((d) => d.status === 'active')
        .reduce((s, d) => s + ((d.amount ?? 0) - (d.used_amount ?? 0)), 0);
      return {
        'Nom': c.name || '',
        'Téléphone': c.phone || '',
        'Email': c.email || '',
        'Adresse': c.address || '',
        'Acompte disponible': totalActive,
        'Nombre acomptes': deps.length,
        'Description': c.description || '',
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), 'Clients');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = new Uint8Array(out);

    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return Response.json({ base64: btoa(binary), filename: 'clients.xlsx' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
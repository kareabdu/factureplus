import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as XLSX from 'npm:xlsx@0.18.5';

const CATEGORY_LABELS = {
  loyer: 'Loyer', salaire: 'Salaire', fournitures: 'Fournitures',
  transport: 'Transport', facture: 'Facture', impot: 'Impôt', autre: 'Autre',
};

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

    const expenses = query
      ? await sr.entities.Expense.filter(query, '-date', 10000)
      : await base44.entities.Expense.list('-date', 10000);

    const rows = (expenses || []).map((e) => ({
      'Date': e.date || '',
      'Commerçant': e.merchant_name || '',
      'Catégorie': CATEGORY_LABELS[e.category] || e.category || '',
      'Montant': e.amount ?? 0,
      'Devise': e.currency || 'XOF',
      'Méthode paiement': e.payment_method || '',
      'Description': e.description || '',
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), 'Dépenses');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = new Uint8Array(out);

    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return Response.json({ base64: btoa(binary), filename: 'depenses.xlsx' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
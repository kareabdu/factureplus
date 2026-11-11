import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as XLSX from 'npm:xlsx@0.18.5';

const STATUS_LABELS = {
  draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard',
  cancelled: 'Annulée', refused: 'Refusée', accepted: 'Acceptée',
};
const TYPE_LABELS = { invoice: 'Facture', proforma: 'Devis', bl: 'Bon de livraison', return: 'Bon de retour' };

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

    const [invoices, items] = await Promise.all([
      query
        ? sr.entities.Invoice.filter(query, '-created_date', 10000)
        : base44.entities.Invoice.list('-created_date', 10000),
      query
        ? sr.entities.InvoiceItem.filter(query, '-created_date', 50000)
        : base44.entities.InvoiceItem.list('-created_date', 50000),
    ]);

    const itemByInvoice = {};
    (items || []).forEach((it) => {
      if (!it.invoice_id) return;
      (itemByInvoice[it.invoice_id] ||= []).push(it);
    });

    const invRows = (invoices || []).map((inv) => {
      const payments = Array.isArray(inv.payments) ? inv.payments : [];
      const payStr = payments.map((p) => `${p.amount} (${p.method || ''} ${p.date || ''})`).join(' | ');
      return {
        'Numéro': inv.invoice_number || '',
        'Date': inv.date || '',
        'Type': TYPE_LABELS[inv.type] || inv.type || '',
        'Statut': STATUS_LABELS[inv.status] || inv.status || '',
        'Client': inv.customer_name || '',
        'Téléphone': inv.customer_phone || '',
        'Adresse': inv.billing_address || '',
        'Montant total': inv.total_amount ?? 0,
        'Acompte': inv.deposit_amount ?? 0,
        'Solde dû': inv.balance_due ?? 0,
        'Méthode paiement': inv.payment_method || '',
        'Échéance': inv.due_date || '',
        'Paiements': payStr,
        'Livreur': inv.livreur_name || '',
        'Notes': inv.notes || '',
        'Devise': inv.currency || 'XOF',
      };
    });

    const itemRows = [];
    for (const inv of (invoices || [])) {
      const list = itemByInvoice[inv.id] || [];
      for (const it of list) {
        itemRows.push({
          'Numéro facture': inv.invoice_number || '',
          'Client': inv.customer_name || '',
          'Article': it.product_name || '',
          'Quantité': it.quantity ?? 0,
          'Unité': it.unit || 'Pcs',
          'Prix unitaire': it.unit_price ?? 0,
          'Total': it.total_price ?? 0,
          'Taxable': it.taxable ? 'Oui' : 'Non',
          'Description': it.description || '',
        });
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows), 'Documents');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows.length ? itemRows : [{}]), 'Articles');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = new Uint8Array(out);

    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return Response.json({ base64: btoa(binary), filename: 'factures.xlsx' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
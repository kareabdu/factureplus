import React from "react";
import { Phone, Mail, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatAmount } from "@/lib/formatAmount";
import { computeTax } from "@/lib/tax";

const logoSizeClass = (size) => ({
  small: "w-12 h-12",
  medium: "w-20 h-20",
  large: "w-28 h-28",
}[size] || "w-20 h-20");

const statusLabels = {
  draft: { label: "Brouillon", color: "bg-gray-100 text-gray-800 border-gray-200" },
  sent: { label: "Envoyée", color: "bg-blue-100 text-blue-800 border-blue-200" },
  paid: { label: "Payée", color: "bg-green-100 text-green-800 border-green-200" },
  overdue: { label: "En retard", color: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800 border-red-200" },
  refused: { label: "Refusée", color: "bg-red-100 text-red-800 border-red-200" },
};

// ─── ITEMS TABLE (en-tête vert, lignes alternées) ───────────────────────────
function ItemsTable({ items, sym, isBL, accent, locations }) {
  const locName = (id) => (Array.isArray(locations) ? locations.find((l) => l.id === id)?.name : null) || "Emplacement";
  const itemLocText = (it) => {
    const allocs = Array.isArray(it.allocations) && it.allocations.length
      ? it.allocations.filter((a) => a && a.location_id)
      : (it.location_id ? [{ location_id: it.location_id, quantity: it.quantity }] : []);
    if (!allocs.length) return "—";
    return Array.from(new Set(allocs.map((a) => locName(a.location_id)))).join(", ");
  };

  // BL : on aplatit par emplacement (une ligne par allocation).
  // Facture/Devis : une ligne par article, emplacement affiché s'il existe.
  const rows = [];
  for (const it of (items || [])) {
    if (isBL) {
      const allocRows = Array.isArray(it._blAllocRows) && it._blAllocRows.length ? it._blAllocRows : null;
      if (allocRows) {
        const r = allocRows[0];
        rows.push({ name: it.product_name, qty: r.qty, unit: it.unit || "Pcs", loc: r.name || "—" });
      } else {
        const allocs = Array.isArray(it.allocations) && it.allocations.length
          ? it.allocations.filter((a) => a && a.location_id)
          : (it.location_id ? [{ location_id: it.location_id, quantity: it.quantity }] : []);
        const loc = allocs.length ? Array.from(new Set(allocs.map((a) => locName(a.location_id)))).join(", ") : "—";
        rows.push({ name: it.product_name, qty: it.quantity, unit: it.unit || "Pcs", loc });
      }
    } else {
      rows.push({ name: it.product_name, qty: it.quantity, unit: it.unit || "Pcs", loc: itemLocText(it), price: it.unit_price, amount: (it.unit_price || 0) * (it.quantity || 0) });
    }
  }

  const hasAnyLocation = (items || []).some((it) => {
    const allocs = Array.isArray(it.allocations) && it.allocations.length
      ? it.allocations.filter((a) => a && a.location_id)
      : (it.location_id ? [{ location_id: it.location_id, quantity: it.quantity }] : []);
    return allocs.length > 0;
  });
  const colCount = isBL ? (hasAnyLocation ? 4 : 3) : (hasAnyLocation ? 6 : 5);
  const distinctProducts = new Set((items || []).map((it) => it.product_name)).size;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-semibold text-gray-900">Liste des articles</p>
        <p className="text-[11px] text-gray-400">{rows.length} ligne(s) — {distinctProducts} article(s)</p>
      </div>
      <table className="w-full border border-gray-200 rounded overflow-hidden" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: isBL ? (hasAnyLocation ? "46%" : "60%") : "38%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          {!isBL && <col style={{ width: "20%" }} />}
          {!isBL && <col style={{ width: "20%" }} />}
          {isBL && hasAnyLocation && <col style={{ width: "32%" }} />}
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: accent }}>
            <th className="p-2 text-[11px] uppercase text-left text-white font-semibold">Nom</th>
            <th className="p-2 text-[11px] uppercase text-left text-white font-semibold">Qté</th>
            <th className="p-2 text-[11px] uppercase text-left text-white font-semibold">Unité</th>
            {!isBL && <th className="p-2 text-[11px] uppercase text-right text-white font-semibold">Prix</th>}
            {!isBL && <th className="p-2 text-[11px] uppercase text-right text-white font-semibold">Montant</th>}
            {isBL && hasAnyLocation && <th className="p-2 text-[11px] uppercase text-left text-white font-semibold">Emplacement</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-2 text-sm font-medium text-gray-900 truncate" title={r.name}>{r.name}</td>
              <td className="p-2 text-sm text-gray-700 whitespace-nowrap">{r.qty}</td>
              <td className="p-2 text-sm text-gray-700 whitespace-nowrap">{r.unit}</td>
              {!isBL && <td className="p-2 text-sm text-gray-700 whitespace-nowrap text-right">{formatAmount(r.price, sym)}</td>}
              {!isBL && <td className="p-2 text-sm font-medium text-gray-900 whitespace-nowrap text-right">{formatAmount(r.amount, sym)}</td>}
              {isBL && hasAnyLocation && <td className="p-2 text-sm text-gray-700 truncate" title={r.loc}>{r.loc}</td>}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={colCount} className="py-6 text-center text-gray-400 text-sm">Aucun article</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ─── CLASSIC ────────────────────────────────────────────────────────────────
function ClassicLayout({ invoice, items, settings, sym, isProforma, isBL, accent, locations }) {
  const title = isBL ? "Bon de livraison" : isProforma ? "Proforma" : "Facture";
  const balanceDue = invoice?.balance_due || 0;
  const depositAmount = invoice?.deposit_amount || 0;

  return (
    <div className="bg-white">
      {/* Top accent line */}
      <div className="h-1" style={{ backgroundColor: accent }} />

      {/* Header */}
      <div className="p-6 border-b flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-3">
          {settings?.company_logo_url ? (
            <img src={settings.company_logo_url} alt="Logo" className={`${logoSizeClass(settings?.logo_size)} object-contain rounded border`} crossOrigin="anonymous" />
          ) : (
            <div className="w-20 h-20 rounded-lg flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundColor: accent }}>
              {(settings?.company_name?.charAt(0) || "E").toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-bold text-base text-gray-900">{settings?.company_name || "Mon Entreprise"}</h2>
            {settings?.company_address && <p className="text-xs text-gray-500">{settings.company_address}</p>}
            <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-gray-500">
              {settings?.company_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{settings.company_phone}</span>}
              {settings?.company_phone2 && <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />{settings.company_phone2}</span>}
            </div>
            {settings?.company_email && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{settings.company_email}</p>}
            {settings?.company_rcm && <p className="text-xs text-gray-500 mt-0.5">RCM : {settings.company_rcm}</p>}
            {settings?.company_ninea && <p className="text-xs text-gray-500 mt-0.5">NINEA : {settings.company_ninea}</p>}
            {!settings?.company_rcm && !settings?.company_ninea && settings?.company_tax_id && <p className="text-xs text-gray-500 mt-0.5">N° fiscal : {settings.company_tax_id}</p>}
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <p className="text-[10px] text-gray-400 uppercase" style={{ color: accent }}>{title}</p>
          <p className="text-lg font-bold text-gray-900">{invoice.invoice_number}</p>
          <p className="text-[10px] text-gray-400 uppercase">Date</p>
          <p className="text-sm">{invoice.date ? format(new Date(invoice.date), "dd MMM yyyy") : "-"}</p>
          {invoice.due_date && <><p className="text-[10px] text-gray-400 uppercase">Échéance</p><p className="text-sm">{format(new Date(invoice.due_date), "dd MMM yyyy")}</p></>}
          {!isBL && (<>
          <p className="text-[10px] text-gray-400 uppercase">Solde dû</p>
          <p className="text-base font-bold" style={{ color: accent }}>{formatAmount(balanceDue, sym)}</p>
          </>)}
          {invoice.status === "paid" && <Badge className={`${statusLabels[invoice.status]?.color} border text-[10px]`}>{statusLabels[invoice.status]?.label}</Badge>}
        </div>
      </div>

      {/* Billing */}
      <div className="px-6 py-3 border-b">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Adresse de facturation</p>
        <p className="font-semibold text-sm">{invoice.customer_name}</p>
        {invoice.customer_phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Smartphone className="w-3 h-3" />{invoice.customer_phone}</p>}
        {invoice.billing_address && <p className="text-xs text-gray-500">{invoice.billing_address}</p>}
        {isBL && invoice.livreur_name && <p className="text-xs text-gray-500 mt-0.5">Livreur : <span className="font-medium text-gray-700">{invoice.livreur_name}</span></p>}
      </div>

      {/* Items */}
      <div className="p-6">
        <ItemsTable items={items} sym={sym} isBL={isBL} accent={accent} locations={locations} />
<Totals invoice={invoice} items={items} settings={settings} sym={sym} accent={accent} depositAmount={depositAmount} balanceDue={balanceDue} isBL={isBL} />
        <FooterNotes invoice={invoice} settings={settings} />
        <Signature settings={settings} isProforma={isProforma} />
      </div>
    </div>
  );
}

// ─── COMPACT ────────────────────────────────────────────────────────────────
function CompactLayout({ invoice, items, settings, sym, isProforma, isBL, accent, locations }) {
  const title = isBL ? "Bon de livraison" : isProforma ? "Proforma" : "Facture";
  const balanceDue = invoice?.balance_due || 0;
  const depositAmount = invoice?.deposit_amount || 0;

  return (
    <div className="bg-white">
      <div className="h-1" style={{ backgroundColor: accent }} />
      {/* Header: company left, client right */}
      <div className="p-6 border-b flex justify-between gap-4">
        <div className="flex gap-3 items-start">
          {settings?.company_logo_url ? (
            <img src={settings.company_logo_url} alt="Logo" className={`${logoSizeClass(settings?.logo_size)} object-contain rounded border`} crossOrigin="anonymous" />
          ) : (
            <div className="w-20 h-20 rounded-lg flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundColor: accent }}>
              {(settings?.company_name?.charAt(0) || "E").toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-bold text-base">{settings?.company_name || "Mon Entreprise"}</h2>
            {settings?.company_address && <p className="text-xs text-gray-500">{settings.company_address}</p>}
            {settings?.company_phone && <p className="text-xs text-gray-500">{settings.company_phone}</p>}
            {settings?.company_email && <p className="text-xs text-gray-500">{settings.company_email}</p>}
            {settings?.company_rcm && <p className="text-xs text-gray-500">RCM : {settings.company_rcm}</p>}
            {settings?.company_ninea && <p className="text-xs text-gray-500">NINEA : {settings.company_ninea}</p>}
            {!settings?.company_rcm && !settings?.company_ninea && settings?.company_tax_id && <p className="text-xs text-gray-500">N° fiscal : {settings.company_tax_id}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-gray-400">Adresse de facturation</p>
          <p className="font-semibold text-sm">{invoice.customer_name}</p>
          {invoice.customer_phone && <p className="text-xs text-gray-500">{invoice.customer_phone}</p>}
          {invoice.billing_address && <p className="text-xs text-gray-500">{invoice.billing_address}</p>}
          {isBL && invoice.livreur_name && <p className="text-xs text-gray-500 mt-0.5">Livreur : <span className="font-medium text-gray-700">{invoice.livreur_name}</span></p>}
        </div>
      </div>

      {/* Invoice meta bar */}
      <div className="px-6 py-3 border-b grid grid-cols-4 gap-2 text-sm">
        <div><p className="text-[10px] text-gray-400 uppercase">{title}</p><p className="font-semibold">{invoice.invoice_number}</p></div>
        <div><p className="text-[10px] text-gray-400 uppercase">Date</p><p>{invoice.date ? format(new Date(invoice.date), "dd MMM yyyy") : "-"}</p></div>
        {!isBL && <div><p className="text-[10px] text-gray-400 uppercase">Montant dû</p><p>{invoice.payment_terms || "Dû à réception"}</p></div>}
        {!isBL && <div className="text-right"><p className="text-[10px] text-gray-400 uppercase">Solde dû</p><p className="font-bold" style={{ color: accent }}>{formatAmount(balanceDue, sym)}</p></div>}
      </div>

      {/* Items in bordered table */}
      <div className="p-6">
        <ItemsTable items={items} sym={sym} isBL={isBL} accent={accent} locations={locations} />
<Totals invoice={invoice} items={items} settings={settings} sym={sym} accent={accent} depositAmount={depositAmount} balanceDue={balanceDue} isBL={isBL} />
        <FooterNotes invoice={invoice} settings={settings} />
        <Signature settings={settings} isProforma={isProforma} />
      </div>
    </div>
  );
}

// ─── CLEAN ──────────────────────────────────────────────────────────────────
function CleanLayout({ invoice, items, settings, sym, isProforma, isBL, accent, locations }) {
  const title = isBL ? "Bon de livraison" : isProforma ? "Proforma" : "Facture";
  const balanceDue = invoice?.balance_due || 0;
  const depositAmount = invoice?.deposit_amount || 0;

  return (
    <div className="bg-white">
      {/* Header: company left, logo right */}
      <div className="p-6 border-b flex justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">{settings?.company_name || "Mon Entreprise"}</h2>
          {settings?.company_address && <p className="text-xs text-gray-500">{settings.company_address}</p>}
          {settings?.company_phone && <p className="text-xs text-gray-500">{settings.company_phone}</p>}
          {settings?.company_email && <p className="text-xs text-gray-500">{settings.company_email}</p>}
          {settings?.company_rcm && <p className="text-xs text-gray-500">RCM : {settings.company_rcm}</p>}
          {settings?.company_ninea && <p className="text-xs text-gray-500">NINEA : {settings.company_ninea}</p>}
          {!settings?.company_rcm && !settings?.company_ninea && settings?.company_tax_id && <p className="text-xs text-gray-500">N° fiscal : {settings.company_tax_id}</p>}
        </div>
        {settings?.company_logo_url ? (
          <img src={settings.company_logo_url} alt="Logo" className={`${logoSizeClass(settings?.logo_size)} object-contain rounded border`} crossOrigin="anonymous" />
        ) : (
          <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: accent }}>
            {(settings?.company_name?.charAt(0) || "E").toUpperCase()}
          </div>
        )}
      </div>

      {/* Client + invoice meta */}
      <div className="px-6 py-4 border-b flex justify-between gap-4">
        <div>
          <p className="text-[10px] text-gray-400 uppercase mb-0.5">Adresse de facturation</p>
          <p className="font-semibold text-sm">{invoice.customer_name}</p>
          {invoice.customer_phone && <p className="text-xs text-gray-500">{invoice.customer_phone}</p>}
          {invoice.billing_address && <p className="text-xs text-gray-500">{invoice.billing_address}</p>}
          {isBL && invoice.livreur_name && <p className="text-xs text-gray-500 mt-0.5">Livreur : <span className="font-medium text-gray-700">{invoice.livreur_name}</span></p>}
        </div>
        <div className="text-right space-y-0.5">
          <p className="text-[10px] text-gray-400 uppercase">Date</p>
          <p className="text-sm">{invoice.date ? format(new Date(invoice.date), "dd MMM yyyy") : "-"}</p>
          {!isBL && <p className="text-[10px] text-gray-400 uppercase">Montant dû</p>}
          {!isBL && <p className="text-sm">{invoice.payment_terms || "Dû à réception"}</p>}
          <p className="text-[10px] text-gray-400 uppercase">{title}</p>
          <p className="text-sm font-semibold">{invoice.invoice_number}</p>
          {!isBL && <p className="text-[10px] text-gray-400 uppercase">Solde dû</p>}
          {!isBL && <p className="text-base font-bold" style={{ color: accent }}>{formatAmount(balanceDue, sym)}</p>}
          {invoice.status === "paid" && <Badge className={`${statusLabels[invoice.status]?.color} border text-[10px]`}>{statusLabels[invoice.status]?.label}</Badge>}
        </div>
      </div>

      {/* Items — dark header table */}
      <div className="p-6">
        <ItemsTable items={items} sym={sym} isBL={isBL} accent={accent} locations={locations} />
<Totals invoice={invoice} items={items} settings={settings} sym={sym} accent={accent} depositAmount={depositAmount} balanceDue={balanceDue} isBL={isBL} />
        <FooterNotes invoice={invoice} settings={settings} />
        <Signature settings={settings} isProforma={isProforma} />
      </div>
    </div>
  );
}

// ─── SHARP ──────────────────────────────────────────────────────────────────
function SharpLayout({ invoice, items, settings, sym, isProforma, isBL, accent, locations }) {
  const title = isBL ? "Bon de livraison" : isProforma ? "Proforma" : "Facture";
  const balanceDue = invoice?.balance_due || 0;
  const depositAmount = invoice?.deposit_amount || 0;

  return (
    <div className="bg-white">
      <div className="h-1.5" style={{ backgroundColor: accent }} />
      {/* Header: gray bg */}
      <div className="bg-gray-100 p-6 border-b flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-3 items-center">
          {settings?.company_logo_url ? (
            <img src={settings.company_logo_url} alt="Logo" className={`${logoSizeClass(settings?.logo_size)} object-contain rounded border bg-white`} crossOrigin="anonymous" />
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: accent }}>
              {(settings?.company_name?.charAt(0) || "E").toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-bold text-base">{settings?.company_name || "Mon Entreprise"}</h2>
            {settings?.company_address && <p className="text-xs text-gray-600">{settings.company_address}</p>}
            {settings?.company_phone && <p className="text-xs text-gray-600">{settings.company_phone}</p>}
            {settings?.company_email && <p className="text-xs text-gray-600">{settings.company_email}</p>}
            {settings?.company_rcm && <p className="text-xs text-gray-600">RCM : {settings.company_rcm}</p>}
            {settings?.company_ninea && <p className="text-xs text-gray-600">NINEA : {settings.company_ninea}</p>}
            {!settings?.company_rcm && !settings?.company_ninea && settings?.company_tax_id && <p className="text-xs text-gray-600">N° fiscal : {settings.company_tax_id}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg" style={{ color: accent }}>{title}</p>
          <p className="text-sm font-medium">{invoice.invoice_number}</p>
          <p className="text-xs text-gray-500">{invoice.date ? format(new Date(invoice.date), "dd MMM yyyy") : "-"}</p>
          {invoice.due_date && <p className="text-xs text-gray-500">Éch.: {format(new Date(invoice.due_date), "dd MMM yyyy")}</p>}
          {!isBL && <p className="text-base font-bold mt-1" style={{ color: accent }}>{formatAmount(balanceDue, sym)}</p>}
          {invoice.status === "paid" && <Badge className={`${statusLabels[invoice.status]?.color} border text-[10px] mt-1`}>{statusLabels[invoice.status]?.label}</Badge>}
        </div>
      </div>

      {/* Billing */}
      <div className="px-6 py-4 border-b">
        <p className="text-[10px] uppercase text-gray-400 mb-0.5">Adresse de facturation</p>
        <p className="font-semibold text-sm">{invoice.customer_name}</p>
        {invoice.customer_phone && <p className="text-xs text-gray-500">{invoice.customer_phone}</p>}
        {invoice.billing_address && <p className="text-xs text-gray-500">{invoice.billing_address}</p>}
        {isBL && invoice.livreur_name && <p className="text-xs text-gray-500 mt-0.5">Livreur : <span className="font-medium text-gray-700">{invoice.livreur_name}</span></p>}
      </div>

      {/* Items */}
      <div className="p-6">
        <ItemsTable items={items} sym={sym} isBL={isBL} accent={accent} locations={locations} />
<Totals invoice={invoice} items={items} settings={settings} sym={sym} accent={accent} depositAmount={depositAmount} balanceDue={balanceDue} isBL={isBL} />
        <FooterNotes invoice={invoice} settings={settings} />
        <Signature settings={settings} isProforma={isProforma} />
      </div>
    </div>
  );
}

// ─── SHARED SUB-COMPONENTS ───────────────────────────────────────────────────
function BLAllocations({ items, locations }) {
  const locName = (id) => (Array.isArray(locations) ? locations.find((l) => l.id === id)?.name : null) || "Emplacement";
  const rows = [];
  for (const it of items || []) {
    if (Array.isArray(it._blAllocRows) && it._blAllocRows.length) {
      for (const r of it._blAllocRows) rows.push({ name: it.product_name, loc: r.name, qty: r.qty });
      continue;
    }
    const allocs = Array.isArray(it.allocations) && it.allocations.length
      ? it.allocations.filter((a) => a && a.location_id)
      : (it.location_id ? [{ location_id: it.location_id, quantity: it.quantity }] : []);
    for (const a of allocs) {
      rows.push({ name: it.product_name, loc: locName(a.location_id), qty: a.quantity });
    }
  }
  if (rows.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-gray-200">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1.5">Emplacements</p>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between text-xs text-gray-700">
            <span className="truncate">{r.name} — {r.loc}</span>
            <span className="font-medium ml-2 whitespace-nowrap">{r.qty}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Totals({ invoice, items, settings, sym, accent, depositAmount, balanceDue, isBL }) {
  if (isBL) return null;
  const subtotal = (items || []).reduce((s, it) => s + (it.total_price || 0), 0);
  const taxableSubtotal = (items || []).filter((it) => it.taxable !== false).reduce((s, it) => s + (it.total_price || 0), 0);
  const tax = !isBL ? computeTax(settings, subtotal, taxableSubtotal) : null;
  return (
    <div className="flex justify-end mt-4 pt-3 border-t">
      <div className="w-56 space-y-1.5">
        {!isBL && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">SOUS-TOTAL</span>
            <span className="font-semibold">{formatAmount(subtotal, sym)}</span>
          </div>
        )}
        {tax && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{tax.name} ({tax.rate}%){tax.inclusive ? " inclus" : ""}</span>
            <span className="text-gray-700">{formatAmount(tax.taxAmount, sym)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">TOTAL</span>
          <span className="font-semibold">{formatAmount(invoice.total_amount, sym)}</span>
        </div>
        {!isBL && depositAmount > 0 && invoice.status !== "paid" && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Acompte</span>
            <span className="text-orange-600">-{formatAmount(depositAmount, sym)}</span>
          </div>
        )}
        {!isBL && (
          <div className="flex justify-between text-sm border-t pt-1.5">
            <span className="text-gray-500">SOLDE DÛ</span>
            <span className="text-base font-bold" style={{ color: accent }}>{formatAmount(balanceDue, sym)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FooterNotes({ invoice, settings }) {
  if (!invoice.notes && !settings?.invoice_footer) return null;
  return (
    <div className="mt-4 pt-3 border-t text-xs text-gray-500 space-y-1">
      {invoice.notes && <p>{invoice.notes}</p>}
      {settings?.invoice_footer && <p className="italic">{settings.invoice_footer}</p>}
    </div>
  );
}

function Signature({ settings, isProforma }) {
  if (isProforma || !settings?.signature_url) return null;
  return (
    <div className="mt-4 pt-3 border-t flex flex-col items-end">
      <img src={settings.signature_url} alt="Signature" className="h-14 object-contain" crossOrigin="anonymous" />
      <div className="w-40 border-t border-gray-300 mt-1" />
      <p className="text-[10px] uppercase text-gray-400 mt-0.5">Signature</p>
    </div>
  );
}

function ImagesBlock({ invoice }) {
  const imgs = invoice?.images;
  if (!imgs || imgs.length === 0) return null;
  return (
    <div className="bg-white p-6 border-t">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Images</p>
      <div className="grid grid-cols-2 gap-3">
        {imgs.map((img, i) => (
          <div key={i} className="border rounded overflow-hidden">
            <img src={img.url} alt={img.description || ""} className="w-full h-32 object-cover" crossOrigin="anonymous" />
            {img.description && <p className="text-[11px] text-gray-600 px-2 py-1">{img.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────
export default function InvoiceDocument({ invoice, items, settings, locations, docRef }) {
  const sym = settings?.currency_symbol || invoice?.currency_symbol || "CFA";
  const isProforma = invoice?.type === "proforma";
  const isBL = invoice?.type === "bl";
  const template = settings?.invoice_template || "classic";
  const accent = settings?.invoice_color || "#2563EB";

  const props = { invoice, items, settings, sym, isProforma, isBL, accent, locations };

  const layouts = {
    classic: <ClassicLayout {...props} />,
    compact: <CompactLayout {...props} />,
    clean: <CleanLayout {...props} />,
    sharp: <SharpLayout {...props} />,
  };

  return (
    <div ref={docRef} className="rounded-lg shadow-lg overflow-hidden">
      {layouts[template] || layouts.classic}
      {isBL && <ImagesBlock invoice={invoice} />}
    </div>
  );
}
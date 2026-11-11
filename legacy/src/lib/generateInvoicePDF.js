import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { computeTax } from "@/lib/tax";

// Formatage montant PDF : séparateur milliers = "."
const fmtAmt = (value, symbol = "") => {
  const num = Number(value) || 0;
  const isCfa = (symbol || "").toUpperCase() === "CFA";
  const fractionDigits = isCfa ? 0 : 2;
  const formatted = num.toLocaleString("fr-FR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).replace(/\s/g, ".");
  return symbol ? `${formatted} ${symbol}` : formatted;
};
const formatAmount = fmtAmt;

const hexToRgb = (hex) => {
  const h = (hex || "#2563EB").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(n, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const loadImage = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || 1;
        c.height = img.naturalHeight || 1;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve({ data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

const fmtDate = (d) => (d ? format(new Date(d), "dd MMM yyyy") : "-");

export async function generateInvoicePDF({ invoice, items, settings, locations }) {
  const sym = settings?.currency_symbol || invoice?.currency_symbol || "CFA";
  const isProforma = invoice?.type === "proforma";
  const isBL = invoice?.type === "bl";
  const template = settings?.invoice_template || "classic";
  const accent = settings?.invoice_color || "#2563EB";
  const accentRgb = hexToRgb(accent);
  const title = isBL ? "Bon de livraison" : isProforma ? "Proforma" : "Facture";

  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.setProperties({ title: `${title} ${invoice?.invoice_number || ""}` });

  const pageW = 210;
  const pageH = 297;
  const margin = 14;
  const contentW = pageW - margin * 2;
  const right = margin + contentW;
  let y = 0;

  // Pré-chargement des images (logo, signature, images BL)
  const logo = settings?.company_logo_url ? await loadImage(settings.company_logo_url) : null;
  const sig = !isProforma && settings?.signature_url ? await loadImage(settings.signature_url) : null;
  const blImgs =
    isBL && Array.isArray(invoice?.images)
      ? await Promise.all(invoice.images.map((im) => loadImage(im.url)))
      : [];

  const setFont = (bold, size, color) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    if (color) pdf.setTextColor(color[0], color[1], color[2]);
    else pdf.setTextColor(30, 30, 30);
  };
  const text = (str, x, yy, { bold, size = 10, color, align = "left", maxW } = {}) => {
    setFont(bold, size, color);
    const lines = maxW ? pdf.splitTextToSize(String(str ?? ""), maxW) : [String(str ?? "")];
    pdf.text(lines, x, yy, { align });
    return yy + lines.length * size * 0.4;
  };

  const logoMm = { small: 13, medium: 20, large: 28 }[settings?.logo_size] || 20;
  const drawLogo = (x, top, size = logoMm) => {
    if (logo) {
      const ratio = logo.h / logo.w;
      let w = size, h = size * ratio;
      if (h > size) { h = size; w = size / ratio; }
      pdf.addImage(logo.data, "PNG", x, top, w, h, undefined, "FAST");
      return w;
    }
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    pdf.roundedRect(x, top, size, size, 2, 2, "F");
    setFont(true, 16, [255, 255, 255]);
    pdf.text((settings?.company_name?.charAt(0) || "E").toUpperCase(), x + size / 2, top + size / 2 + 3, { align: "center" });
    return size;
  };

  const companyLines = () => {
    const out = [];
    if (settings?.company_address) out.push(settings.company_address);
    const phones = [settings?.company_phone, settings?.company_phone2].filter(Boolean).join("  ·  ");
    if (phones) out.push(phones);
    if (settings?.company_email) out.push(settings.company_email);
    if (settings?.company_rcm) out.push(`RCM : ${settings.company_rcm}`);
    if (settings?.company_ninea) out.push(`NINEA : ${settings.company_ninea}`);
    if (!settings?.company_rcm && !settings?.company_ninea && settings?.company_tax_id) out.push(`N° fiscal : ${settings.company_tax_id}`);
    return out;
  };

  const drawCompanyBlock = (x, top, size = logoMm) => {
    const lw = drawLogo(x, top, size);
    const tx = x + lw + 3;
    const maxW = right - tx - 60;
    setFont(true, 11);
    pdf.text(settings?.company_name || "Mon Entreprise", tx, top + 5);
    let ly = top + 9;
    setFont(false, 8, [110, 110, 110]);
    for (const l of companyLines()) {
      const lines = pdf.splitTextToSize(l, maxW);
      pdf.text(lines, tx, ly);
      ly += lines.length * 3.2;
    }
  };

  // ── HEADER par modèle ────────────────────────────────────────────────
  const headerBottom = (() => {
    if (template === "sharp") {
      pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      pdf.rect(0, 0, pageW, 1.4, "F");
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, 1.4, pageW, 30, "F");
      const top = 6;
      drawCompanyBlock(margin, top, 14);
      const rx = right;
      setFont(true, 14, accentRgb);
      pdf.text(title, rx, top + 5, { align: "right" });
      setFont(true, 10);
      pdf.text(invoice?.invoice_number || "", rx, top + 11, { align: "right" });
      setFont(false, 8, [110, 110, 110]);
      pdf.text(fmtDate(invoice?.date), rx, top + 16, { align: "right" });
      let yy = top + 20;
      if (invoice?.due_date) { pdf.text(`Éch. : ${fmtDate(invoice.due_date)}`, rx, yy, { align: "right" }); yy += 4; }
      if (!isBL) { setFont(true, 12, accentRgb); pdf.text(formatAmount(invoice?.balance_due || 0, sym), rx, yy, { align: "right" }); }
      // billing
      let by = 31.4 + 6;
      setFont(false, 7, [150, 150, 150]); pdf.text("ADRESSE DE FACTURATION", margin, by);
      setFont(true, 10); pdf.text(invoice?.customer_name || "", margin, by + 5);
      setFont(false, 8, [110, 110, 110]);
      let bly = by + 9;
      if (invoice?.customer_phone) { pdf.text(invoice.customer_phone, margin, bly); bly += 3.6; }
      if (invoice?.billing_address) { const ls = pdf.splitTextToSize(invoice.billing_address, contentW); pdf.text(ls, margin, bly); bly += ls.length * 3.4; }
      return bly + 2;
    }
    if (template === "compact") {
      pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      pdf.rect(0, 0, pageW, 1, "F");
      const top = 6;
      drawCompanyBlock(margin, top);
      const rx = right;
      setFont(false, 7, [150, 150, 150]);
      pdf.text("ADRESSE DE FACTURATION", rx, top + 5, { align: "right" });
      setFont(true, 10);
      pdf.text(invoice?.customer_name || "", rx, top + 10, { align: "right" });
      setFont(false, 8, [110, 110, 110]);
      let yy = top + 14;
      if (invoice?.customer_phone) { pdf.text(invoice.customer_phone, rx, yy, { align: "right" }); yy += 3.6; }
      if (invoice?.billing_address) {
        const ls = pdf.splitTextToSize(invoice.billing_address, 70);
        pdf.text(ls, rx, yy, { align: "right" }); yy += ls.length * 3.4;
      }
      const hb = Math.max(yy, top + 22);
      pdf.setDrawColor(225, 225, 225); pdf.line(margin, hb, right, hb);
      // meta bar 4 cols
      const cw = contentW / 4;
      const my = hb + 5;
      setFont(false, 7, [150, 150, 150]); pdf.text(title.toUpperCase(), margin, my);
      setFont(true, 10); pdf.text(invoice?.invoice_number || "", margin, my + 5);
      setFont(false, 7, [150, 150, 150]); pdf.text("DATE", margin + cw, my);
      setFont(false, 10); pdf.text(fmtDate(invoice?.date), margin + cw, my + 5);
      if (!isBL) {
        setFont(false, 7, [150, 150, 150]); pdf.text("MONTANT DÛ", margin + cw * 2, my);
        setFont(false, 10); pdf.text(invoice?.payment_terms || "Dû à réception", margin + cw * 2, my + 5);
        setFont(false, 7, [150, 150, 150]); pdf.text("SOLDE DÛ", right, my, { align: "right" });
        setFont(true, 10, accentRgb); pdf.text(formatAmount(invoice?.balance_due || 0, sym), right, my + 5, { align: "right" });
      }
      return my + 10;
    }
    if (template === "clean") {
      const top = 12;
      setFont(true, 13);
      pdf.text(settings?.company_name || "Mon Entreprise", margin, top);
      setFont(false, 8, [110, 110, 110]);
      let ly = top + 5;
      for (const l of companyLines()) {
        const ls = pdf.splitTextToSize(l, contentW - 30);
        pdf.text(ls, margin, ly); ly += ls.length * 3.4;
      }
      drawLogo(right - 14, top - 6, 14);
      const hb = Math.max(ly, top + 12);
      pdf.setDrawColor(225, 225, 225); pdf.line(margin, hb, right, hb);
      // client + meta
      const cy = hb + 6;
      setFont(false, 7, [150, 150, 150]); pdf.text("ADRESSE DE FACTURATION", margin, cy);
      setFont(true, 10); pdf.text(invoice?.customer_name || "", margin, cy + 5);
      setFont(false, 8, [110, 110, 110]);
      let cly = cy + 9;
      if (invoice?.customer_phone) { pdf.text(invoice.customer_phone, margin, cly); cly += 3.6; }
      if (invoice?.billing_address) { const ls = pdf.splitTextToSize(invoice.billing_address, 90); pdf.text(ls, margin, cly); cly += ls.length * 3.4; }
      const rx = right;
      let ry = cy;
      setFont(false, 7, [150, 150, 150]); pdf.text("DATE", rx, ry, { align: "right" });
      setFont(false, 10); pdf.text(fmtDate(invoice?.date), rx, ry + 5, { align: "right" });
      ry += 11;
      if (!isBL) {
        setFont(false, 7, [150, 150, 150]); pdf.text("MONTANT DÛ", rx, ry, { align: "right" });
        setFont(false, 10); pdf.text(invoice?.payment_terms || "Dû à réception", rx, ry + 5, { align: "right" });
        ry += 11;
      }
      setFont(false, 7, [150, 150, 150]); pdf.text(title.toUpperCase(), rx, ry, { align: "right" });
      setFont(true, 10); pdf.text(invoice?.invoice_number || "", rx, ry + 5, { align: "right" });
      ry += 11;
      if (!isBL) {
        setFont(false, 7, [150, 150, 150]); pdf.text("SOLDE DÛ", rx, ry, { align: "right" });
        setFont(true, 12, accentRgb); pdf.text(formatAmount(invoice?.balance_due || 0, sym), rx, ry + 5, { align: "right" });
        ry += 8;
      }
      return Math.max(cly, ry) + 4;
    }
    // classic
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    pdf.rect(0, 0, pageW, 1, "F");
    const top = 8;
    drawCompanyBlock(margin, top);
    const rx = right;
    setFont(false, 7, accentRgb); pdf.text(title.toUpperCase(), rx, top + 4, { align: "right" });
    setFont(true, 13); pdf.text(invoice?.invoice_number || "", rx, top + 10, { align: "right" });
    setFont(false, 7, [150, 150, 150]); pdf.text("DATE", rx, top + 15, { align: "right" });
    setFont(false, 10); pdf.text(fmtDate(invoice?.date), rx, top + 20, { align: "right" });
    let yy = top + 25;
    if (invoice?.due_date) {
      setFont(false, 7, [150, 150, 150]); pdf.text("ÉCHÉANCE", rx, yy, { align: "right" });
      setFont(false, 10); pdf.text(fmtDate(invoice.due_date), rx, yy + 5, { align: "right" });
      yy += 9;
    }
    if (!isBL) {
      setFont(false, 7, [150, 150, 150]); pdf.text("SOLDE DÛ", rx, yy, { align: "right" });
      setFont(true, 12, accentRgb); pdf.text(formatAmount(invoice?.balance_due || 0, sym), rx, yy + 5, { align: "right" });
      yy += 9;
    }
    const hb = Math.max(yy, top + 22);
    pdf.setDrawColor(225, 225, 225); pdf.line(margin, hb, right, hb);
    // billing
    let by = hb + 6;
    setFont(false, 7, [150, 150, 150]); pdf.text("ADRESSE DE FACTURATION", margin, by);
    setFont(true, 10); pdf.text(invoice?.customer_name || "", margin, by + 5);
    setFont(false, 8, [110, 110, 110]);
    let bly = by + 9;
    if (invoice?.customer_phone) { pdf.text(invoice.customer_phone, margin, bly); bly += 3.6; }
    if (invoice?.billing_address) { const ls = pdf.splitTextToSize(invoice.billing_address, contentW); pdf.text(ls, margin, bly); bly += ls.length * 3.4; }
    return bly + 2;
  })();

  y = headerBottom + 6;

  // ── TABLE ARTICLES ──────────────────────────────────────────────────
  const locName = (id) => (Array.isArray(locations) ? locations.find((l) => l.id === id)?.name || "Emplacement" : "Emplacement");
  const buildRows = () => {
    const rows = [];
    for (const it of items || []) {
      if (isBL) {
        const allocRows = Array.isArray(it._blAllocRows) && it._blAllocRows.length ? it._blAllocRows : null;
        if (allocRows) {
          const r = allocRows[0];
          rows.push({ name: it.product_name, qty: r.qty, unit: it.unit || "Pcs", loc: r.name || "—" });
        } else {
          const allocs = Array.isArray(it.allocations) && it.allocations.length ? it.allocations.filter((a) => a && a.location_id) : it.location_id ? [{ location_id: it.location_id, quantity: it.quantity }] : [];
          const loc = allocs.length ? Array.from(new Set(allocs.map((a) => locName(a.location_id)))).join(", ") : "—";
          rows.push({ name: it.product_name, qty: it.quantity, unit: it.unit || "Pcs", loc });
        }
      } else {
        const allocs = Array.isArray(it.allocations) && it.allocations.length ? it.allocations.filter((a) => a && a.location_id) : it.location_id ? [{ location_id: it.location_id, quantity: it.quantity }] : [];
        const loc = allocs.length ? Array.from(new Set(allocs.map((a) => locName(a.location_id)))).join(", ") : "—";
        rows.push({ name: it.product_name, qty: it.quantity, unit: it.unit || "Pcs", loc, price: it.unit_price, amount: (it.unit_price || 0) * (it.quantity || 0) });
      }
    }
    return rows;
  };
  const hasAnyLocation = (items || []).some((it) => {
    const allocs = Array.isArray(it.allocations) && it.allocations.length ? it.allocations.filter((a) => a && a.location_id) : it.location_id ? [{ location_id: it.location_id, quantity: it.quantity }] : [];
    return allocs.length > 0;
  });
  const rows = buildRows();

  // Emplacement masqué du PDF
  const cols = isBL ? [0.58, 0.18, 0.24] : [0.44, 0.10, 0.12, 0.17, 0.17];
  const headers = isBL ? ["Nom", "Qté", "Unité"] : ["Nom", "Qté", "Unité", "Prix", "Montant"];

  const colX = [];
  let acc = margin;
  for (const f of cols) { colX.push(acc); acc += contentW * f; }
  const colW = cols.map((f) => contentW * f);
  const aligns = isBL ? ["left", "left", "left"] : ["left", "left", "left", "right", "right"];

  const drawTableHeader = () => {
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    pdf.rect(margin, y, contentW, 7, "F");
    setFont(true, 8, [255, 255, 255]);
    headers.forEach((h, i) => pdf.text(h.toUpperCase(), aligns[i] === "right" ? colX[i] + colW[i] - 2 : colX[i] + 2, y + 4.8, { align: aligns[i] === "right" ? "right" : "left" }));
    y += 7;
  };
  drawTableHeader();

  setFont(false, 9);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (y + 7 > pageH - margin) { pdf.addPage(); y = margin + 4; drawTableHeader(); }
    if (i % 2 === 1) { pdf.setFillColor(248, 248, 248); pdf.rect(margin, y, contentW, 6.5, "F"); }
    setFont(false, 9, [30, 30, 30]);
    const nameLines = pdf.splitTextToSize(String(r.name || ""), colW[0] - 4);
    pdf.text(nameLines, colX[0] + 2, y + 4.5);
    pdf.text(String(r.qty ?? ""), colX[1] + 2, y + 4.5);
    pdf.text(String(r.unit || ""), colX[2] + 2, y + 4.5);
    if (!isBL) {
      pdf.text(formatAmount(r.price, sym), colX[3] + colW[3] - 2, y + 4.5, { align: "right" });
      setFont(true, 9); pdf.text(formatAmount(r.amount, sym), colX[4] + colW[4] - 2, y + 4.5, { align: "right" }); setFont(false, 9);
    }
    y += Math.max(6.5, nameLines.length * 4);
  }
  pdf.setDrawColor(225, 225, 225); pdf.line(margin, y, right, y);
  y += 6;

  // ── TOTAUX ──────────────────────────────────────────────────────────
  if (!isBL) {
    const subtotal = (items || []).reduce((s, it) => s + (it.total_price || 0), 0);
    const taxableSubtotal = (items || []).filter((it) => it.taxable !== false).reduce((s, it) => s + (it.total_price || 0), 0);
    const tax = computeTax(settings, subtotal, taxableSubtotal);
    const boxW = 74;
    const bx = right - boxW;
    const row = (label, val, { bold, color, line } = {}) => {
      setFont(bold, 9, color);
      pdf.text(label, bx, y);
      pdf.text(val, bx + boxW, y, { align: "right" });
      y += 5;
      if (line) { pdf.setDrawColor(225, 225, 225); pdf.line(bx, y - 1.5, bx + boxW, y - 1.5); }
    };
    row("SOUS-TOTAL", formatAmount(subtotal, sym), {});
    if (tax) row(`${tax.name} (${tax.rate}%)${tax.inclusive ? " inclus" : ""}`, formatAmount(tax.taxAmount, sym), { color: [110, 110, 110] });
    row("TOTAL", formatAmount(invoice?.total_amount || 0, sym), { bold: true });
    const deposit = invoice?.deposit_amount || 0;
    if (deposit > 0 && invoice?.status !== "paid") row("Acompte", `-${formatAmount(deposit, sym)}`, { color: [200, 90, 30] });
    row("SOLDE DÛ", formatAmount(invoice?.balance_due || 0, sym), { bold: true, color: accentRgb, line: true });
    y += 4;
  }

  // ── NOTES + PIED DE PAGE ─────────────────────────────────────────────
  if (invoice?.notes || settings?.invoice_footer) {
    if (y + 8 > pageH - margin) { pdf.addPage(); y = margin + 4; }
    pdf.setDrawColor(225, 225, 225); pdf.line(margin, y, right, y); y += 5;
    setFont(false, 8, [110, 110, 110]);
    if (invoice?.notes) { const ls = pdf.splitTextToSize(invoice.notes, contentW); pdf.text(ls, margin, y); y += ls.length * 3.6; }
    if (settings?.invoice_footer) { setFont(false, 8, [130, 130, 130]); const ls = pdf.splitTextToSize(settings.invoice_footer, contentW); pdf.text(ls, margin, y); y += ls.length * 3.6; }
  }

  // ── SIGNATURE ───────────────────────────────────────────────────────
  if (sig) {
    if (y + 24 > pageH - margin) { pdf.addPage(); y = margin + 4; }
    y += 4;
    const sw = 40, sh = 16;
    const sx = right - sw;
    try { pdf.addImage(sig.data, "PNG", sx, y, sw, sh, undefined, "FAST"); } catch { /* ignore */ }
    y += sh + 2;
    pdf.setDrawColor(180, 180, 180); pdf.line(sx, y, right, y); y += 3;
    setFont(false, 7, [150, 150, 150]); pdf.text("SIGNATURE", right, y, { align: "right" });
    y += 4;
  }

  // ── IMAGES (BL) ─────────────────────────────────────────────────────
  if (isBL && blImgs.length) {
    if (y + 50 > pageH - margin) { pdf.addPage(); y = margin + 4; }
    y += 4;
    setFont(false, 7, [150, 150, 150]); pdf.text("IMAGES", margin, y); y += 6;
    const gap = 6;
    const iw = (contentW - gap) / 2;
    let col = 0;
    for (const im of blImgs) {
      if (!im) continue;
      if (y + 44 > pageH - margin) { pdf.addPage(); y = margin + 4; col = 0; }
      const ix = margin + col * (iw + gap);
      pdf.setDrawColor(225, 225, 225); pdf.rect(ix, y, iw, 40, "S");
      try {
        const ratio = im.h / im.w;
        let w = iw, h = iw * ratio;
        if (h > 40) { h = 40; w = 40 / ratio; }
        pdf.addImage(im.data, "PNG", ix + (iw - w) / 2, y + (40 - h) / 2, w, h, undefined, "FAST");
      } catch { /* ignore */ }
      col++;
      if (col >= 2) { col = 0; y += 44; }
    }
    if (col !== 0) y += 44;
  }

  // ── PIED DE PAGE : lien de l'app ─────────────────────────────────────
  const appUrl = "https://invoice.kareapps.com";
  const pageCount = pdf.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    setFont(false, 7, [150, 150, 150]);
    pdf.textWithLink(appUrl, pageW / 2, pageH - 6, { align: "center", url: appUrl });
  }
  pdf.setPage(pageCount);

  return pdf;
}
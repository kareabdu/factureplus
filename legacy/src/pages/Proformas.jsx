import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Invoice, InvoiceItem, Settings } from "@/entities/all";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { FileText, Share2, Check, XCircle, Trash2, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import InvoiceTabs from "@/components/invoices/InvoiceTabs";
import InvoiceRow from "@/components/invoices/InvoiceRow";
import CreateInvoiceFab from "@/components/invoices/CreateInvoiceFab";
import InvoiceActionSheet from "@/components/invoices/InvoiceActionSheet";

import { getTeamId } from "@/lib/team";
import { getTeamSettings } from "@/lib/teamSettings";
import { logActivity } from "@/lib/activity";
import useStickyHeader from "@/hooks/useStickyHeader";
import { formatAmount } from "@/lib/formatAmount";
import usePersistedSearch from "@/hooks/usePersistedSearch";

const PROFORMA_TABS = [
  { key: "all", label: "Toutes" },
  { key: "accepted", label: "Accepté" },
  { key: "refused", label: "Refusé" },
];

export default function Proformas() {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState([]);
  const [searchTerm, setSearchTerm] = usePersistedSearch("search_proformas");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionProforma, setActionProforma] = useState(null);
  const [actionAnchor, setActionAnchor] = useState(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const [highlightedId, setHighlightedId] = useState(() => {
    const id = sessionStorage.getItem("proformas_last_opened") || null;
    if (id) sessionStorage.removeItem("proformas_last_opened");
    return id;
  });
  const [stickyRef, stickyH] = useStickyHeader();

  const generateNumber = (s, type) => {
    const y = new Date().getFullYear();
    const prefix = type === "proforma" ? (s.proforma_prefix || "PRO-") : (s.invoice_prefix || "FAC-");
    const num = type === "proforma" ? (s.proforma_next_number || 1) : (s.invoice_next_number || 1);
    return (s.invoice_number_format || "{PREFIX}{YYYY}-{N:04d}")
      .replace("{PREFIX}", prefix).replace("{YYYY}", String(y))
      .replace(/\{N:(\d+)d\}/, (_, len) => String(num).padStart(Number(len), "0"));
  };

  // Devis accepté : on crée une copie historique (reste proforma, statut accepted)
  // puis on transforme l'original en facture avec numérotation facture.
  const handleAccept = async (proforma) => {
    const [teamSettings, items] = await Promise.all([
      getTeamSettings(),
      InvoiceItem.filter({ invoice_id: proforma.id }),
    ]);
    const s = teamSettings || {};

    const copy = await Invoice.create({
      invoice_number: proforma.invoice_number,
      date: proforma.date,
      type: "proforma",
      status: "accepted",
      team_id: await getTeamId(),
      customer_name: proforma.customer_name,
      customer_phone: proforma.customer_phone,
      billing_address: proforma.billing_address,
      total_amount: proforma.total_amount || 0,
      balance_due: proforma.total_amount || 0,
      deposit_amount: 0,
      payment_terms: proforma.payment_terms,
      due_date: proforma.due_date,
      currency: proforma.currency,
      currency_symbol: proforma.currency_symbol,
      notes: proforma.notes,
      payments: [],
    });
    for (const it of items) {
      await InvoiceItem.create({
        invoice_id: copy.id,
        product_id: it.product_id || "",
        product_name: it.product_name,
        unit_price: it.unit_price || 0,
        quantity: it.quantity || 1,
        unit: it.unit || "Pcs",
        total_price: it.total_price || 0,
        team_id: await getTeamId(),
      });
    }

    const invoiceNumber = generateNumber(s, "invoice");
    await Invoice.update(proforma.id, {
      type: "invoice",
      status: "draft",
      invoice_number: invoiceNumber,
    });
    if (s.id) {
      await Settings.update(s.id, { invoice_next_number: (s.invoice_next_number || 1) + 1 });
    }
    logActivity({ action_type: "accept", entity_type: "proforma", entity_id: proforma.id, description: "Devis accepté", metadata: { number: proforma.invoice_number } });
    setActionProforma(null);
    loadProformas();
    navigate(`${createPageUrl("AddInvoice")}?type=invoice&id=${proforma.id}`);
  };

  const handleRefuse = async (proforma) => {
    await Invoice.update(proforma.id, { status: "refused" });
    logActivity({ action_type: "refuse", entity_type: "proforma", entity_id: proforma.id, description: "Devis refusé", metadata: { number: proforma.invoice_number } });
    setActionProforma(null);
    loadProformas();
  };

  const handleShare = async (proforma) => {
    const [items, teamSettings] = await Promise.all([
      InvoiceItem.filter({ invoice_id: proforma.id }),
      getTeamSettings(),
    ]);
    const settings = teamSettings || {};
    const { generateInvoicePDF } = await import("@/lib/generateInvoicePDF");
    const doc = await generateInvoicePDF({ invoice: proforma, items, settings });
    const file = new File([doc.output("blob")], `${proforma.invoice_number || "document"}.pdf`, { type: "application/pdf" });
    setActionProforma(null);
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: proforma.invoice_number || "Devis" }); return; } catch { /* ignore */ }
    }
    doc.save(`${proforma.invoice_number || "document"}.pdf`);
  };

  const handleDelete = async (proforma) => {
    if (!confirm("Supprimer ce devis ?")) return;
    const items = await InvoiceItem.filter({ invoice_id: proforma.id });
    for (const it of items) await InvoiceItem.delete(it.id);
    await Invoice.delete(proforma.id);
    logActivity({ action_type: "delete", entity_type: "proforma", description: "Devis supprimé", metadata: { number: proforma.invoice_number } });
    setActionProforma(null);
    loadProformas();
  };

  const buildActions = (proforma) => {
    const actions = [{ label: "Partager", icon: Share2, onClick: () => handleShare(proforma) }];
    if (proforma.status !== "accepted" && proforma.status !== "refused") {
      actions.push({ label: "Accepter", icon: Check, onClick: () => handleAccept(proforma) });
      actions.push({ label: "Refuser", icon: XCircle, danger: true, onClick: () => handleRefuse(proforma) });
    }
    actions.push({ label: "Supprimer", icon: Trash2, danger: true, onClick: () => handleDelete(proforma) });
    return actions;
  };

  const loadProformas = useCallback(async () => {
    setIsLoading(true);
    const data = await Invoice.filter({ type: "proforma" }, "-created_date");
    setProformas(Array.isArray(data) ? data : []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadProformas(); }, [loadProformas]);
  useEffect(() => { if (searchOpen) searchInputRef.current?.focus(); }, [searchOpen]);

  // Scroll vers le devis récemment créé/modifié au retour depuis l'éditeur
  useEffect(() => {
    if (highlightedId && listRef.current) {
      const el = listRef.current.querySelector(`[data-invoice-id="${highlightedId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      const t = setTimeout(() => setHighlightedId(null), 2500);
      return () => clearTimeout(t);
    }
  }, [highlightedId, proformas]);

  const touchStart = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const order = ["all", "accepted", "refused"];
      const idx = order.indexOf(activeTab);
      if (dx < 0 && idx < order.length - 1) setActiveTab(order[idx + 1]);
      else if (dx > 0 && idx > 0) setActiveTab(order[idx - 1]);
    }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return proformas.filter((p) => {
      const tabOk =
        activeTab === "accepted" ? p.status === "accepted"
        : activeTab === "refused" ? p.status === "refused"
        : true;
      if (!tabOk) return false;
      if (!s) return true;
      return (
        (p.invoice_number || "").toLowerCase().includes(s) ||
        (p.customer_name || "").toLowerCase().includes(s) ||
        (p.billing_address || "").toLowerCase().includes(s)
      );
    });
  }, [proformas, activeTab, searchTerm]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const p of filtered) {
      const d = p.date || p.created_date;
      const year = d ? new Date(d).getFullYear() : "—";
      if (!map.has(year)) map.set(year, []);
      map.get(year).push(p);
    }
    return [...map.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background">
      {/* Desktop header */}
      <div className="hidden md:block max-w-5xl mx-auto px-8 pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground">Devis</h1>
            <p className="text-muted-foreground mt-1">{proformas.length} devis</p>
          </div>
          <button
            onClick={() => navigate(`${createPageUrl("AddInvoice")}?type=proforma`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 flex items-center gap-1.5 text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau devis
          </button>
        </div>
      </div>

      {/* Search + tabs */}
      <div ref={stickyRef} className="sticky top-0 z-30 bg-[#F5F3F2]/95 md:bg-background/95 backdrop-blur-sm md:max-w-5xl md:mx-auto md:px-8 border-b border-border/60">
        <div className="px-4 pt-3 md:px-0">
          <SearchInput
            inputRef={searchInputRef}
            placeholder="Client ou numéro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 pt-2 pb-2">
          <div className="flex-1 min-w-0">
            <InvoiceTabs
              tabs={PROFORMA_TABS}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 md:max-w-5xl md:mx-auto md:px-8 md:pt-4 md:pb-8" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {isLoading ? null : groups.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun devis trouvé</p>
          </div>
        ) : (
          <div ref={listRef}>
            {groups.map(([year, items]) => {
              const yearTotal = items.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
              const sym = items[0]?.currency_symbol || "CFA";
              return (
                <React.Fragment key={year}>
                  <div className="flex items-center justify-between px-4 pt-4 pb-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{year}</span>
                    <span className="text-xs font-semibold text-foreground">{formatAmount(yearTotal, sym)}</span>
                  </div>
                  <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-soft">
                  {items.map((p) => (
                    <InvoiceRow
                      key={p.id}
                      invoice={p}
                      formatMoney={(v) => formatAmount(v, p.currency_symbol || "CFA")}
                      onLongPress={(p, coords) => { setActionProforma(p); setActionAnchor(coords || null); }}
                      highlighted={highlightedId === p.id}
                    />
                  ))}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <CreateInvoiceFab type="proforma" hidden={!!actionProforma} />
      <InvoiceActionSheet
        anchor={actionAnchor}
        title={actionProforma?.invoice_number}
        actions={actionProforma ? buildActions(actionProforma) : null}
        onClose={() => { setActionProforma(null); setActionAnchor(null); }}
      />
    </div>
  );
}
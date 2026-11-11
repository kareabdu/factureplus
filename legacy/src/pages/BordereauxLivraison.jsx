import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Invoice, InvoiceItem } from "@/entities/all";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { FileText, Eye, Share2, Ban, Trash2, Search, Plus, CheckCircle, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import InvoiceTabs from "@/components/invoices/InvoiceTabs";
import InvoiceRow from "@/components/invoices/InvoiceRow";
import InvoiceActionSheet from "@/components/invoices/InvoiceActionSheet";
import CreateInvoiceFab from "@/components/invoices/CreateInvoiceFab";
import { getTeamSettings } from "@/lib/teamSettings";
import { logActivity } from "@/lib/activity";
import { checkLivreurStock, applyBLStatusChange } from "@/lib/livreurStock";
import useStickyHeader from "@/hooks/useStickyHeader";
import { formatAmount } from "@/lib/formatAmount";
import usePersistedSearch from "@/hooks/usePersistedSearch";

const BL_TABS = [
  { key: "all", label: "Tous" },
  { key: "delivered", label: "Livrés" },
  { key: "draft", label: "En attente" },
  { key: "returns", label: "Retours" },
];

export default function BordereauxLivraison() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [searchTerm, setSearchTerm] = usePersistedSearch("search_bl");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [actionInvoice, setActionInvoice] = useState(null);
  const [actionAnchor, setActionAnchor] = useState(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const [highlightedId, setHighlightedId] = useState(() => {
    const id = sessionStorage.getItem("bls_last_opened") || null;
    if (id) sessionStorage.removeItem("bls_last_opened");
    return id;
  });
  const [stickyRef, stickyH] = useStickyHeader();

  const handleShare = async (inv) => {
    const [items, teamSettings] = await Promise.all([InvoiceItem.filter({ invoice_id: inv.id }), getTeamSettings()]);
    const settings = teamSettings || {};
    const { generateInvoicePDF } = await import("@/lib/generateInvoicePDF");
    const doc = await generateInvoicePDF({ invoice: inv, items, settings });
    const file = new File([doc.output("blob")], `${inv.invoice_number || "document"}.pdf`, { type: "application/pdf" });
    setActionInvoice(null);
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: inv.invoice_number || "Bon de livraison" }); return; } catch { /* ignore */ }
    }
    doc.save(`${inv.invoice_number || "document"}.pdf`);
  };

  const handleSetBLStatus = async (inv, targetStatus) => {
    if (inv.status === targetStatus) return;
    if (targetStatus === "cancelled" && !confirm("Annuler ce bon de livraison ?")) return;
    setActionInvoice(null);
    try {
      const items = await InvoiceItem.filter({ invoice_id: inv.id });
      if (targetStatus === "sent" && inv.livreur_id) {
        const missing = await checkLivreurStock(inv.livreur_id, items);
        if (missing.length && !confirm(`Stock livreur insuffisant pour : ${missing.join(", ")}. Livrer quand même ?`)) return;
      }
      await Invoice.update(inv.id, { status: targetStatus });
      try { await applyBLStatusChange(inv.status, targetStatus, inv.livreur_id, items, inv.livreur_name); } catch { /* ignore */ }
      const labels = { draft: "remis en attente", sent: "marqué livré", cancelled: "annulé" };
      logActivity({ action_type: "update", entity_type: "bl", entity_id: inv.id, description: `Bon de livraison ${labels[targetStatus] || targetStatus}`, metadata: { number: inv.invoice_number } });
    } catch { /* ignore */ }
    loadDocs();
  };

  const handleDeleteBL = async (inv) => {
    if (!confirm("Supprimer ce bon de livraison ?")) return;
    setActionInvoice(null);
    setDocs((prev) => prev.filter((d) => d.id !== inv.id));
    try {
      const items = await InvoiceItem.filter({ invoice_id: inv.id });
      for (const it of items) await InvoiceItem.delete(it.id).catch(() => {});
      await Invoice.delete(inv.id);
      logActivity({ action_type: "delete", entity_type: inv.type === "return" ? "return" : "bl", description: inv.type === "return" ? "Bon de retour supprimé" : "Bon de livraison supprimé", metadata: { number: inv.invoice_number } });
    } catch { /* already gone */ }
    loadDocs();
  };

  const buildActions = (inv) => {
    if (inv.type === "return") {
      return [
        { label: "Aperçu", icon: Eye, onClick: () => navigate(`${createPageUrl("AddInvoice")}?type=return&id=${inv.id}`) },
        { label: "Partager", icon: Share2, onClick: () => handleShare(inv) },
        { label: "Supprimer", icon: Trash2, danger: true, onClick: () => handleDeleteBL(inv) },
      ];
    }
    const actions = [
      { label: "Aperçu", icon: Eye, onClick: () => navigate(`${createPageUrl("AddInvoice")}?type=bl&id=${inv.id}`) },
      { label: "Partager", icon: Share2, onClick: () => handleShare(inv) },
    ];
    if (inv.status !== "sent") actions.push({ label: "Marquer livré", icon: CheckCircle, onClick: () => handleSetBLStatus(inv, "sent") });
    if (inv.status === "sent") actions.push({ label: "Remettre en attente", icon: RotateCcw, onClick: () => handleSetBLStatus(inv, "draft") });
    if (inv.status === "cancelled") actions.push({ label: "Réactiver", icon: RotateCcw, onClick: () => handleSetBLStatus(inv, "draft") });
    if (inv.status !== "cancelled") actions.push({ label: "Annuler", icon: Ban, onClick: () => handleSetBLStatus(inv, "cancelled") });
    actions.push({ label: "Supprimer", icon: Trash2, danger: true, onClick: () => handleDeleteBL(inv) });
    return actions;
  };

  const loadDocs = useCallback(async () => {
    setIsLoading(true);
    const [bls, rets] = await Promise.all([
      Invoice.filter({ type: "bl" }, "-created_date"),
      Invoice.filter({ type: "return" }, "-created_date"),
    ]);
    setDocs([...(Array.isArray(bls) ? bls : []), ...(Array.isArray(rets) ? rets : [])]);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // Scroll vers le bon récemment créé/modifié au retour depuis l'éditeur
  useEffect(() => {
    if (highlightedId && listRef.current) {
      const el = listRef.current.querySelector(`[data-invoice-id="${highlightedId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      const t = setTimeout(() => setHighlightedId(null), 2500);
      return () => clearTimeout(t);
    }
  }, [highlightedId, docs]);

  const touchStart = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const order = ["all", "delivered", "draft", "returns"];
      const idx = order.indexOf(activeTab);
      if (dx < 0 && idx < order.length - 1) setActiveTab(order[idx + 1]);
      else if (dx > 0 && idx > 0) setActiveTab(order[idx - 1]);
    }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return docs.filter((b) => {
      const tabOk =
        activeTab === "delivered" ? (b.type === "bl" && b.status === "sent")
        : activeTab === "draft" ? (b.type === "bl" && b.status === "draft")
        : activeTab === "returns" ? b.type === "return"
        : b.type === "bl";
      if (!tabOk) return false;
      if (!s) return true;
      return (
        (b.invoice_number || "").toLowerCase().includes(s) ||
        (b.customer_name || "").toLowerCase().includes(s) ||
        (b.billing_address || "").toLowerCase().includes(s)
      );
    });
  }, [docs, activeTab, searchTerm]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const b of filtered) {
      const d = b.date || b.created_date;
      const year = d ? new Date(d).getFullYear() : "—";
      if (!map.has(year)) map.set(year, []);
      map.get(year).push(b);
    }
    return [...map.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background">
      {/* Desktop header */}
      <div className="hidden md:block max-w-5xl mx-auto px-8 pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground">Bons de livraison</h1>
            <p className="text-muted-foreground mt-1">{docs.filter((d) => d.type === "bl").length} bon{docs.filter((d) => d.type === "bl").length > 1 ? "s" : ""} de livraison</p>
          </div>
          <button
            onClick={() => navigate(`${createPageUrl("AddInvoice")}?type=bl`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 flex items-center gap-1.5 text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau bon
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
              tabs={BL_TABS}
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
            <p className="text-muted-foreground">{activeTab === "returns" ? "Aucun bon de retour" : "Aucun bon de livraison trouvé"}</p>
          </div>
        ) : (
          <div ref={listRef}>
            {groups.map(([year, items]) => (
              <React.Fragment key={year}>
                <div className="flex items-center justify-between px-4 pt-4 pb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{year}</span>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-soft">
                {items.map((b) => (
                  <InvoiceRow
                    key={b.id}
                    invoice={b}
                    formatMoney={(v) => formatAmount(v, b.currency_symbol || "CFA")}
                    onLongPress={(inv, coords) => { setActionInvoice(inv); setActionAnchor(coords || null); }}
                    highlighted={highlightedId === b.id}
                  />
                ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <CreateInvoiceFab type="bl" hidden={!!actionInvoice} />
      <InvoiceActionSheet
        anchor={actionAnchor}
        title={actionInvoice?.invoice_number}
        actions={actionInvoice ? buildActions(actionInvoice) : null}
        onClose={() => { setActionInvoice(null); setActionAnchor(null); }}
      />
    </div>
  );
}
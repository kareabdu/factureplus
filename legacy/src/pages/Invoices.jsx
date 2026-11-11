import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Invoice, InvoiceItem, Settings } from "@/entities/all";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { FileText, Plus, Search, Eye, Share2, Truck, CreditCard, Trash2, Ban, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { createPageUrl } from "@/utils";
import InvoiceTabs from "@/components/invoices/InvoiceTabs";
import InvoiceRow from "@/components/invoices/InvoiceRow";
import InvoiceDesktopTable from "@/components/invoices/InvoiceDesktopTable";
import CreateInvoiceFab from "@/components/invoices/CreateInvoiceFab";
import InvoiceActionSheet from "@/components/invoices/InvoiceActionSheet";

import { generateDocNumber, nextNumberField } from "@/lib/docNumber";
import PaymentDialog from "@/components/invoice-editor/PaymentDialog";
import { getTeamId } from "@/lib/team";
import { getTeamSettings } from "@/lib/teamSettings";
import { logActivity } from "@/lib/activity";
import { consumeDeposit } from "@/lib/clientDeposit";
import { base44 } from "@/api/base44Client";
import { isBlEnabled } from "@/lib/planLimits";
import { restoreStockByReference } from "@/lib/stockRestore";
import { getInvoices, peekInvoices, invalidateInvoices, removeInvoiceFromCache } from "@/lib/invoiceCache";
import useStickyHeader from "@/hooks/useStickyHeader";
import { formatAmount } from "@/lib/formatAmount";
import usePersistedSearch from "@/hooks/usePersistedSearch";

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = usePersistedSearch("search_invoices");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("invoices_active_tab") || "all");
  const [highlightedId, setHighlightedId] = useState(() => {
    const id = sessionStorage.getItem("invoices_last_opened") || null;
    if (id) sessionStorage.removeItem("invoices_last_opened");
    return id;
  });
  const listRef = useRef(null);

  useEffect(() => { sessionStorage.setItem("invoices_active_tab", activeTab); }, [activeTab]);

  // Scroll vers la ligne précédemment ouverte au retour
  useEffect(() => {
    if (highlightedId && listRef.current) {
      const el = listRef.current.querySelector(`[data-invoice-id="${highlightedId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      const t = setTimeout(() => setHighlightedId(null), 2500);
      return () => clearTimeout(t);
    }
  }, [highlightedId, invoices]);

  const handleOpenInvoice = (inv) => {
    sessionStorage.setItem("invoices_last_opened", inv.id);
    const docType = inv.type === "proforma" ? "proforma" : inv.type === "bl" ? "bl" : inv.type === "return" ? "return" : "invoice";
    navigate(`${createPageUrl("AddInvoice")}?type=${docType}&id=${inv.id}`);
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionInvoice, setActionInvoice] = useState(null);
  const [actionAnchor, setActionAnchor] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const searchInputRef = useRef(null);
  const [stickyRef, stickyH] = useStickyHeader();

  const today = () => new Date().toISOString().split("T")[0];

  const generateNumber = (s, type) => generateDocNumber(s, type);

  const handleShare = async (inv) => {
    const [items, teamSettings] = await Promise.all([InvoiceItem.filter({ invoice_id: inv.id }), getTeamSettings()]);
    const settings = teamSettings || {};
    const { generateInvoicePDF } = await import("@/lib/generateInvoicePDF");
    const doc = await generateInvoicePDF({ invoice: inv, items, settings });
    const file = new File([doc.output("blob")], `${inv.invoice_number || "document"}.pdf`, { type: "application/pdf" });
    setActionInvoice(null);
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: inv.invoice_number || "Facture" }); return; } catch { /* ignore */ }
    }
    doc.save(`${inv.invoice_number || "document"}.pdf`);
  };

  const handleDeleteInvoice = async (inv) => {
    if (!confirm("Supprimer cette facture ?")) return;
    setActionInvoice(null);
    setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    try {
      // Réinjecter le stock déduit avant suppression. Inconditionnel : la réinjection
      // est un no-op si aucun mouvement n'existe pour cette réf. — le flag
      // stock_deducted peut être faux même quand des mouvements ont été créés.
      if (inv.invoice_number) {
        try { await restoreStockByReference(inv.invoice_number); } catch { /* ignore */ }
      }
      const items = await InvoiceItem.filter({ invoice_id: inv.id });
      for (const it of items) await InvoiceItem.delete(it.id).catch(() => {});
      await Invoice.delete(inv.id);
      logActivity({ action_type: "delete", entity_type: "invoice", description: "Facture supprimée", metadata: { number: inv.invoice_number } });
    } catch (e) {
      // Invoice already gone — keep it removed from the list
    }
    loadInvoices();
  };

  const handleRecordPayment = async ({ amount, method, date }) => {
    const inv = paymentInvoice;
    if (!inv) return;
    const balance = inv.balance_due || inv.total_amount || 0;
    // Le solde dû est déduit de l'acompte disponible (dans la limite du disponible)
    const consumed = await consumeDeposit(inv.customer_name, balance);
    const newBalance = Math.max(0, balance - amount);
    const newStatus = newBalance <= 0 ? "paid" : inv.status === "draft" ? "draft" : "sent";
    const newPayment = { amount, date: date ? new Date(date).toISOString() : new Date().toISOString(), method, deposit_consumed: consumed };
    const updatedPayments = [...(inv.payments || []), newPayment];
    const newDeposit = (parseFloat(inv.deposit_amount) || 0) + amount;
    try {
      await Invoice.update(inv.id, { status: newStatus, balance_due: newBalance, deposit_amount: newDeposit, payments: updatedPayments });
      if (newStatus === "paid") {
        logActivity({ action_type: "payment", entity_type: "invoice", entity_id: inv.id, description: "Paiement enregistré", metadata: { number: inv.invoice_number, amount } });
      }
    } catch (e) {
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    }
    setPaymentInvoice(null);
    loadInvoices();
  };

  const handleMarkPaid = async (inv) => {
    const balance = inv.balance_due || inv.total_amount || 0;
    const consumed = await consumeDeposit(inv.customer_name, balance);
    const newPayment = { amount: balance, date: new Date().toISOString(), method: "Espèces", deposit_consumed: consumed };
    const updatedPayments = [...(inv.payments || []), newPayment];
    const newDeposit = (parseFloat(inv.deposit_amount) || 0) + balance;
    try {
      await Invoice.update(inv.id, { status: "paid", balance_due: 0, deposit_amount: newDeposit, payments: updatedPayments });
      logActivity({ action_type: "payment", entity_type: "invoice", entity_id: inv.id, description: "Facture marquée comme payée", metadata: { number: inv.invoice_number, amount: balance } });
    } catch (e) {
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    }
    loadInvoices();
  };

  const handleCreateBL = async (inv) => {
    const me = await base44.auth.me().catch(() => null);
    if (!isBlEnabled(me)) {
      alert("La génération de bons de livraison n'est pas disponible sur votre plan. Passez au plan Mensuel ou Annuel.");
      setActionInvoice(null);
      return;
    }
    const [teamSettings, items] = await Promise.all([
      getTeamSettings(),
      InvoiceItem.filter({ invoice_id: inv.id }),
    ]);
    const s = teamSettings || {};
    const number = generateNumber(s, "bl");
    const bl = await Invoice.create({
      invoice_number: number, date: today(), type: "bl", status: "draft", stock_deducted: false,
      team_id: await getTeamId(),
      customer_name: inv.customer_name, customer_phone: inv.customer_phone, billing_address: inv.billing_address,
      total_amount: inv.total_amount || 0, balance_due: inv.total_amount || 0, deposit_amount: 0,
      payment_terms: inv.payment_terms, due_date: inv.due_date, currency: inv.currency, currency_symbol: inv.currency_symbol,
      notes: inv.notes, payments: [],
    });
    for (const it of items) {
      await InvoiceItem.create({ invoice_id: bl.id, product_id: it.product_id || "", product_name: it.product_name, unit_price: 0, quantity: it.quantity || 1, unit: it.unit || "Pcs", total_price: 0, location_id: it.location_id || "", allocations: Array.isArray(it.allocations) ? it.allocations : [], team_id: await getTeamId() });
    }
    if (s.id) {
      const field = nextNumberField("bl");
      await Settings.update(s.id, { [field]: (s[field] || 1) + 1 });
    }
    logActivity({ action_type: "create", entity_type: "bl", entity_id: bl.id, description: "Bon de livraison créé depuis une facture", metadata: { number } });
    loadInvoices();
    navigate(`${createPageUrl("BordereauxLivraison")}`);
  };

  const handleCancelInvoice = async (inv) => {
    if (!confirm(`Annuler la facture ${inv.invoice_number || ""} ?\nLe stock déduit sera réinjecté et un bon de retour sera généré.`)) return;
    setActionInvoice(null);
    try {
      // Réinjecte le stock déduit (no-op si aucun mouvement pour cette réf.)
      if (inv.invoice_number) {
        try { await restoreStockByReference(inv.invoice_number); } catch { /* ignore */ }
      }
      await Invoice.update(inv.id, { status: "cancelled", stock_deducted: false });
      // Génère le bon de retour archivé
      const [teamSettings, items] = await Promise.all([getTeamSettings(), InvoiceItem.filter({ invoice_id: inv.id })]);
      const teamId = await getTeamId();
      const retNumber = `RET-${inv.invoice_number || inv.id.slice(-6)}`;
      const ret = await Invoice.create({
        invoice_number: retNumber, date: today(), type: "return", status: "cancelled", stock_deducted: false,
        team_id: teamId,
        customer_name: inv.customer_name, customer_phone: inv.customer_phone, billing_address: inv.billing_address,
        total_amount: inv.total_amount || 0, balance_due: 0, deposit_amount: inv.deposit_amount || 0,
        payment_terms: inv.payment_terms, due_date: inv.due_date, currency: inv.currency, currency_symbol: inv.currency_symbol,
        notes: `Bon de retour généré par l'annulation de la facture ${inv.invoice_number || ""}.`,
        payments: [],
      });
      for (const it of items) {
        await InvoiceItem.create({ invoice_id: ret.id, product_id: it.product_id || "", product_name: it.product_name, unit_price: it.unit_price || 0, quantity: it.quantity || 1, unit: it.unit || "Pcs", total_price: it.total_price || 0, location_id: it.location_id || "", allocations: Array.isArray(it.allocations) ? it.allocations : [], team_id: teamId });
      }
      logActivity({ action_type: "update", entity_type: "invoice", entity_id: inv.id, description: "Facture annulée — bon de retour généré", metadata: { number: inv.invoice_number, return_number: retNumber } });
    } catch (e) {
      console.log(e);
    }
    loadInvoices();
  };

  const buildActions = (inv) => {
    const isCancelled = inv.status === "cancelled";
    const actions = [
      { label: "Aperçu", icon: Eye, onClick: () => navigate(`${createPageUrl("AddInvoice")}?type=invoice&id=${inv.id}`) },
      { label: "Partager", icon: Share2, onClick: () => handleShare(inv) },
    ];
    if (!isCancelled) {
      actions.push({ label: "Bon de livraison", icon: Truck, onClick: () => handleCreateBL(inv) });
      if (inv.status !== "paid") {
        actions.push({ label: "Marquer comme payée", icon: CheckCircle2, onClick: () => handleMarkPaid(inv) });
        actions.push({ label: "Enregistrer un paiement", icon: CreditCard, onClick: () => setPaymentInvoice(inv) });
      }
      actions.push({ label: "Annuler la facture", icon: Ban, danger: true, onClick: () => handleCancelInvoice(inv) });
    }
    actions.push({ label: "Supprimer", icon: Trash2, danger: true, onClick: () => handleDeleteInvoice(inv) });
    return actions;
  };

  const loadInvoices = useCallback(async () => {
    // Affiche immédiatement les données en cache pour éviter l'écran blanc
    // au retour (swipe back), puis rafraîchit en arrière-plan.
    const cached = peekInvoices("invoice");
    if (cached) {
      setInvoices(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    const data = await getInvoices("invoice", true);
    setInvoices(Array.isArray(data) ? data : []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);
  useEffect(() => { if (searchOpen) searchInputRef.current?.focus(); }, [searchOpen]);

  const touchStart = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const order = ["all", "unpaid", "paid", "cancelled"];
      const idx = order.indexOf(activeTab);
      if (dx < 0 && idx < order.length - 1) setActiveTab(order[idx + 1]);
      else if (dx > 0 && idx > 0) setActiveTab(order[idx - 1]);
    }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return invoices.filter((i) => {
      const tabOk =
        activeTab === "paid" ? i.status === "paid"
        : activeTab === "unpaid" ? (i.status !== "paid" && i.status !== "cancelled")
        : activeTab === "cancelled" ? i.status === "cancelled"
        : i.status !== "cancelled";
      if (!tabOk) return false;
      if (!s) return true;
      return (
        (i.invoice_number || "").toLowerCase().includes(s) ||
        (i.customer_name || "").toLowerCase().includes(s) ||
        (i.billing_address || "").toLowerCase().includes(s)
      );
    });
  }, [invoices, activeTab, searchTerm]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const inv of filtered) {
      const d = inv.date || inv.created_date;
      const year = d ? new Date(d).getFullYear() : "—";
      if (!map.has(year)) map.set(year, []);
      map.get(year).push(inv);
    }
    return [...map.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background">
      {/* Desktop header */}
      <div className="hidden md:block pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground">Factures</h1>
            <p className="text-muted-foreground mt-1">{invoices.length} facture{invoices.length > 1 ? "s" : ""}</p>
          </div>

        </div>
      </div>

      {/* Search + tabs */}
      <div ref={stickyRef} className="sticky top-0 z-30 bg-[#F5F3F2]/95 md:bg-background/95 backdrop-blur-sm border-b border-border/60">
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
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
          <div className="hidden md:block flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 flex items-center gap-1.5 text-sm font-medium shadow-sm">
                  <Plus className="w-4 h-4" /> Nouveau
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate(`${createPageUrl("AddInvoice")}?type=invoice`)}>
                  Nouvelle facture
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`${createPageUrl("AddInvoice")}?type=proforma`)}>
                  Nouveau devis
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 md:pt-4 md:pb-8" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {isLoading ? null : groups.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune facture trouvée</p>
          </div>
        ) : (
          <>
          <div ref={listRef} className="lg:hidden">
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
                  {items.map((inv, i) => (
                    <InvoiceRow
                      key={inv.id}
                      invoice={inv}
                      index={i}
                      formatMoney={(v) => formatAmount(v, inv.currency_symbol || "CFA")}
                      onLongPress={(inv, coords) => { setActionInvoice(inv); setActionAnchor(coords || null); }}
                      onOpen={handleOpenInvoice}
                      highlighted={highlightedId === inv.id}
                    />
                  ))}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <InvoiceDesktopTable
            groups={groups}
            onRowClick={handleOpenInvoice}
            actionsFor={buildActions}
            highlightedId={highlightedId}
          />
          </>
        )}
      </div>

      <CreateInvoiceFab type="invoice" hidden={!!actionInvoice} />
      <InvoiceActionSheet
        anchor={actionAnchor}
        title={actionInvoice?.invoice_number}
        actions={actionInvoice ? buildActions(actionInvoice) : null}
        onClose={() => { setActionInvoice(null); setActionAnchor(null); }}
      />
      <PaymentDialog
        open={!!paymentInvoice}
        balanceDue={paymentInvoice ? (paymentInvoice.balance_due || paymentInvoice.total_amount || 0) : 0}
        sym={paymentInvoice?.currency_symbol || "CFA"}
        onRecord={handleRecordPayment}
        onClose={() => setPaymentInvoice(null)}
      />
    </div>
  );
}
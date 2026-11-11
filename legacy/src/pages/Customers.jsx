import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Customer, Invoice } from "@/entities/all";
import CustomerModal from "@/components/customers/CustomerModal";
import CustomerRow from "@/components/customers/CustomerRow";
import CustomerDesktopTable from "@/components/customers/CustomerDesktopTable";
import DepositModal from "@/components/customers/DepositModal";
import InvoiceActionSheet from "@/components/invoices/InvoiceActionSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { Edit, Plus, Search, Trash2, Users, Wallet } from "lucide-react";
import { createPageUrl } from "@/utils";
import usePersistedSearch from "@/hooks/usePersistedSearch";
import Fab from "@/components/Fab";
import { getCustomers, peekCustomers } from "@/lib/customerCache";
import { getInvoices, peekInvoices } from "@/lib/invoiceCache";

const fmt = (value, sym) => {
  const n = Number(value) || 0;
  const s = n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return sym ? `${s} ${sym}` : s;
};

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = usePersistedSearch("search_customers");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [sheet, setSheet] = useState({ open: false, customer: null, anchor: null });
  const [depositFor, setDepositFor] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    // Affiche immédiatement les données en cache pour éviter le gel au
    // retour (swipe back), puis rafraîchit en arrière-plan.
    const cachedC = peekCustomers();
    const cachedI = peekInvoices("invoice");
    if (cachedC) setCustomers(cachedC);
    if (cachedI) setInvoices(cachedI);
    setIsLoading(!cachedC);
    const [c, inv] = await Promise.all([getCustomers(true), getInvoices("invoice", true)]);
    setCustomers(c);
    setInvoices(inv);
    setIsLoading(false);
  };

  const stats = useMemo(() => {
    const map = new Map();
    for (const inv of invoices) {
      if (inv.status === "cancelled" || inv.status === "refused") continue;
      const key = inv.customer_name;
      if (!key) continue;
      if (!map.has(key)) map.set(key, { count: 0, total: 0, sym: inv.currency_symbol || "CFA" });
      const s = map.get(key);
      s.count += 1;
      s.total += Number(inv.total_amount) || 0;
    }
    return map;
  }, [invoices]);

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return customers
      .filter(c => !s || (c.name || "").toLowerCase().includes(s) || (c.phone || "").includes(s) || (c.email || "").toLowerCase().includes(s))
      .sort((a, b) => {
        const sa = stats.get(a.name) || { count: 0, total: 0 };
        const sb = stats.get(b.name) || { count: 0, total: 0 };
        if (sb.total !== sa.total) return sb.total - sa.total;
        return sb.count - sa.count;
      });
  }, [customers, searchTerm, stats]);

  const actionsFor = (c) => [
    { label: "Modifier", icon: Edit, onClick: () => setEditCustomer(c) },
    { label: "Enregistrer un acompte", icon: Wallet, onClick: () => setDepositFor(c) },
    { label: "Supprimer", icon: Trash2, danger: true, onClick: async () => {
      if (!confirm(`Supprimer le client « ${c.name} » ?`)) return;
      await Customer.delete(c.id);
      loadData();
    } },
  ];

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background">
      {/* Desktop header */}
      <div className="hidden md:block pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground">Clients</h1>
            <p className="text-muted-foreground mt-1">{customers.length} client{customers.length > 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCustomerModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 shadow"
            >
              <Plus className="w-4 h-4 mr-2" /> Ajouter un client
            </Button>
          </div>
        </div>
      </div>

      {/* Search + column headers */}
      <div className="sticky top-0 z-20 bg-[#F5F3F2]/95 md:bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="px-4 pt-3 md:px-0">
          <SearchInput
            placeholder="Nom, téléphone ou email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="px-4 md:pt-4 md:pb-8">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <p className="mt-3 text-muted-foreground text-sm">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun client trouvé</p>
          </div>
        ) : (
          <>
          <div className="flex flex-col gap-2 lg:hidden">
            {filtered.map(customer => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                stats={stats}
                fmt={fmt}
                onLongPress={(c, coords) => setSheet({ open: true, customer: c, anchor: coords })}
              />
            ))}
          </div>
          <CustomerDesktopTable
            customers={filtered}
            stats={stats}
            fmt={fmt}
            onRowClick={(c) => navigate(`${createPageUrl("CustomerDetail")}?id=${c.id}`)}
            actionsFor={actionsFor}
          />
          </>
        )}
      </div>

      {/* Mobile FAB */}
      <Fab
        onClick={() => navigate(createPageUrl("AddCustomer"))}
        ariaLabel="Ajouter un client"
        className="md:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-emerald-600 shadow-xl flex items-center justify-center"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      />
      <CustomerModal
        open={showCustomerModal || !!editCustomer}
        customer={editCustomer}
        onClose={() => { setShowCustomerModal(false); setEditCustomer(null); }}
        onSaved={loadData}
      />
      {sheet.open && sheet.customer && (
        <InvoiceActionSheet
          anchor={sheet.anchor}
          title={sheet.customer.name}
          groups={[[
            { label: "Modifier", icon: Edit, onClick: () => setEditCustomer(sheet.customer) },
            { label: "Enregistrer un acompte", icon: Wallet, onClick: () => setDepositFor(sheet.customer) },
          ]]}
          destructive={{ label: "Supprimer", icon: Trash2, onClick: async () => {
            if (!confirm(`Supprimer le client « ${sheet.customer.name} » ?`)) return;
            await Customer.delete(sheet.customer.id);
            loadData();
          } }}
          onClose={() => setSheet({ open: false, customer: null, anchor: null })}
        />
      )}
      {depositFor && (
        <DepositModal
          customerId={depositFor.id}
          customerName={depositFor.name}
          onClose={() => setDepositFor(null)}
          onSaved={() => setDepositFor(null)}
        />
      )}
    </div>
  );
}
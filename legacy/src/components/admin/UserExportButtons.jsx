import React, { useState, useRef, useEffect } from "react";
import { Download, Loader2, ChevronDown, FileText, Package, Users, Truck, Receipt, ArrowLeftRight } from "lucide-react";
import { downloadExport } from "@/lib/downloadExport";

const EXPORTS = [
  { fn: "exportInvoices", label: "Factures", icon: FileText },
  { fn: "exportProducts", label: "Articles", icon: Package },
  { fn: "exportCustomers", label: "Clients", icon: Users },
  { fn: "exportSuppliers", label: "Fournisseurs", icon: Truck },
  { fn: "exportExpenses", label: "Dépenses", icon: Receipt },
  { fn: "exportStockMovements", label: "Mouvements", icon: ArrowLeftRight },
];

export default function UserExportButtons({ user }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleExport = async (fn) => {
    setLoading(fn);
    try {
      await downloadExport(fn, { user_id: user.id });
    } catch (e) {
      alert("Erreur: " + (e.message || e));
    }
    setLoading(null);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
        style={{ minHeight: "unset" }}
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Export...</span></>
        ) : (
          <><Download className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Exporter</span><ChevronDown className="w-3 h-3 text-muted-foreground" /></>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-border/60 py-1 z-50 popover-zoom-fade">
          {EXPORTS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.fn}
                onClick={() => handleExport(opt.fn)}
                disabled={!!loading}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
                style={{ minHeight: "unset" }}
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
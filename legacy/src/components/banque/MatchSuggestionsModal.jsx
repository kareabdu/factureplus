import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Invoice, Expense } from "@/entities/all";
import { formatAmount } from "@/lib/formatAmount";
import { Search, Link2Off, Loader2 } from "lucide-react";

const CATEGORIES = {
  loyer: "Loyer", salaire: "Salaire", fournitures: "Fournitures", transport: "Transport",
  facture: "Facture", impot: "Impôt", autre: "Autre",
};

export default function MatchSuggestionsModal({ open, tx, transactions, sym, onClose, onPick, onDetach }) {
  const [tab, setTab] = useState("invoice");
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab(tx?.type === "credit" ? "invoice" : "expense");
    setSearch("");
    load();
  }, [open, tx?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const [invPage, exps] = await Promise.all([
        Invoice.filter({ type: "invoice" }, { sort: "-date", limit: 200 }),
        Expense.list("-date", 200),
      ]);
      setInvoices((invPage.items || []).filter((i) => i.status !== "cancelled" && i.status !== "refused"));
      setExpenses(Array.isArray(exps) ? exps : []);
    } finally {
      setLoading(false);
    }
  };

  const amount = Number(tx?.amount) || 0;
  const usedIds = new Set(
    (transactions || []).filter((t) => t.id !== tx?.id && t.matched_id).map((t) => t.matched_id)
  );

  const candidates = (tab === "invoice"
    ? invoices.map((i) => ({
        type: "invoice",
        id: i.id,
        label: [i.invoice_number, i.customer_name].filter(Boolean).join(" · ") || "Facture",
        meta: i.date ? i.date.split("T")[0] : "",
        amount: Number(i.balance_due > 0 ? i.balance_due : i.total_amount) || 0,
        hint: i.balance_due > 0 ? "Solde dû" : "Total facture",
      }))
    : expenses.map((e) => ({
        type: "expense",
        id: e.id,
        label: e.merchant_name || "Dépense",
        meta: [e.date ? e.date.split("T")[0] : "", CATEGORIES[e.category] || ""].filter(Boolean).join(" · "),
        amount: Number(e.amount) || 0,
        hint: "Dépense",
      }))
  )
    .filter((c) => !usedIds.has(c.id))
    .filter((c) => !search.trim() || c.label.toLowerCase().includes(search.trim().toLowerCase()))
    .map((c) => ({ ...c, diff: Math.abs(c.amount - amount) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 12);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Rapprocher l'opération</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm flex items-center justify-between">
          <span className="text-muted-foreground truncate">{tx?.description || "Opération"}</span>
          <span className={`font-bold ${tx?.type === "credit" ? "text-emerald-600" : "text-foreground"}`}>
            {tx?.type === "credit" ? "+" : "-"}{formatAmount(amount, sym)}
          </span>
        </div>

        <div className="flex gap-1 rounded-xl bg-[#F5F3F2] p-1">
          {[
            { key: "invoice", label: "Factures" },
            { key: "expense", label: "Dépenses" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 h-9 min-h-0 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un document"
            className="h-9 text-sm pl-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto -mx-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun document disponible.</p>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick({ type: c.type, id: c.id, label: c.label })}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.meta} · {c.hint}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">{formatAmount(c.amount, sym)}</p>
                  {c.diff < 1 ? (
                    <p className="text-[10px] font-medium text-emerald-600">Montant identique</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Écart {formatAmount(c.diff, sym)}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {tx?.matched_id && (
          <Button type="button" variant="outline" onClick={onDetach} className="w-full text-red-600 border-red-200 hover:bg-red-50">
            <Link2Off className="w-4 h-4 mr-2" /> Détacher le document lié
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
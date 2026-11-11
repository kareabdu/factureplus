import React, { useState, useEffect, useRef } from "react";
import { Expense } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, ScanLine } from "lucide-react";
import EmptyState from "@/components/expenses/EmptyState";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseCard from "@/components/expenses/ExpenseCard";
import ExpenseDesktopTable from "@/components/expenses/ExpenseDesktopTable";
import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseSummary from "@/components/expenses/ExpenseSummary";
import { getTeamId } from "@/lib/team";
import { getTeamSettings } from "@/lib/teamSettings";
import { formatAmount } from "@/lib/formatAmount";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [initial, setInitial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState({ preset: "all", start: null, end: null });
  const [currencySymbol, setCurrencySymbol] = useState("CFA");
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadExpenses();
    getTeamSettings().then((s) => { if (s?.currency_symbol) setCurrencySymbol(s.currency_symbol); }).catch(() => {});
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await Expense.list("-created_date");
      setExpenses(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const openManual = () => {
    setInitial(null);
    setFormOpen(true);
  };

  const handleScanClick = () => fileInputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("extractExpenseReceipt", { file_url });
      const out = (res && res.output) || {};
      setInitial({
        merchant_name: out.merchant_name || "",
        amount: out.amount != null ? String(out.amount) : "",
        date: /^\d{4}-\d{2}-\d{2}$/.test(out.date) ? out.date : new Date().toISOString().slice(0, 10),
        category: out.category || "autre",
        payment_method: out.payment_method || "",
        receipt_url: file_url,
      });
      setFormOpen(true);
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const s = (await getTeamSettings()) || {};
      const currency = s.currency || "XOF";
      const currency_symbol = s.currency_symbol || "CFA";
      const team_id = await getTeamId();
      if (initial?.id) {
        await Expense.update(initial.id, { ...data, currency, currency_symbol, team_id });
      } else {
        await Expense.create({ ...data, currency, currency_symbol, team_id });
      }
      setFormOpen(false);
      setInitial(null);
      await loadExpenses();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (exp) => {
    setInitial(exp);
    setFormOpen(true);
  };

  const handleDelete = async (exp) => {
    await Expense.delete(exp.id);
    setExpenses((prev) => prev.filter((x) => x.id !== exp.id));
  };

  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const filtered = React.useMemo(() => {
    const { start, end } = filter;
    if (!start && !end) return expenses;
    return expenses.filter((e) => {
      const d = e.date || "";
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [expenses, filter]);
  const filteredTotal = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background">
      {/* Desktop header */}
      <div className="hidden md:block pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground">Dépenses</h1>
            <p className="text-muted-foreground mt-1">
              {filtered.length} dépense{filtered.length > 1 ? "s" : ""}{filter.preset !== "all" ? " (filtrées)" : ""} · {formatAmount(filteredTotal, "CFA")}
            </p>
          </div>
          <Button
            onClick={openManual}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState onManual={openManual} onScan={handleScanClick} scanning={scanning} />
      ) : (
        <div className="md:pt-4 md:pb-8">
          {/* Filtre date */}
          <div className="px-4 md:px-0 pt-3 md:pt-0 pb-3">
            <ExpenseFilters value={filter} onChange={setFilter} />
          </div>

          {/* Tableau de suivi */}
          <div className="px-4 md:px-0 pb-4">
            <ExpenseSummary expenses={filtered} sym={currencySymbol} />
          </div>

          <div className="md:hidden px-4 pt-1 pb-2">
            <Button
              onClick={openManual}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Ajouter une dépense
            </Button>
            <Button
              onClick={handleScanClick}
              disabled={scanning}
              variant="outline"
              className="w-full mt-2 border-emerald-600 text-emerald-700"
            >
              <ScanLine className="w-4 h-4 mr-2" /> {scanning ? "Analyse du reçu..." : "Scanner un reçu"}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucune dépense sur cette période.
            </div>
          ) : (
            <>
              <div className="lg:hidden md:rounded-2xl md:border md:border-border/60 md:shadow-sm md:overflow-hidden md:bg-card">
                {filtered.map((exp) => (
                  <ExpenseCard key={exp.id} expense={exp} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
              </div>
              <ExpenseDesktopTable expenses={filtered} onEdit={handleEdit} onDelete={handleDelete} />
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <ExpenseForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setInitial(null);
        }}
        onSave={handleSave}
        initial={initial}
        saving={saving}
      />
    </div>
  );
}
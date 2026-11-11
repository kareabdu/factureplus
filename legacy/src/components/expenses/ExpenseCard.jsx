import React from "react";
import { Receipt, Trash2, Pencil } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

const CATEGORY_LABELS = {
  loyer: "Loyer",
  salaire: "Salaire",
  fournitures: "Fournitures",
  transport: "Transport",
  facture: "Facture",
  impot: "Impôt",
  autre: "Autre",
};

const CATEGORY_COLORS = {
  loyer: "bg-purple-50 text-purple-600",
  salaire: "bg-blue-50 text-blue-600",
  fournitures: "bg-orange-50 text-orange-600",
  transport: "bg-cyan-50 text-cyan-600",
  facture: "bg-yellow-50 text-yellow-600",
  impot: "bg-red-50 text-red-600",
  autre: "bg-muted text-muted-foreground",
};

export default function ExpenseCard({ expense, onDelete, onEdit }) {
  const sym = expense.currency_symbol || "CFA";
  return (
    <div className="flex items-center gap-3 p-3 bg-card border-b border-border/60">
      <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {expense.receipt_url ? (
          <img src={expense.receipt_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Receipt className="w-5 h-5 text-green-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{expense.merchant_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {expense.date ? new Date(expense.date).toLocaleDateString("fr-FR") : "—"}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.autre}`}>
            {CATEGORY_LABELS[expense.category] || "Autre"}
          </span>
        </div>
      </div>
      <p className="font-semibold text-foreground text-sm flex-shrink-0">{formatAmount(expense.amount, sym)}</p>
      <button
        onClick={() => onEdit?.(expense)}
        className="p-2 text-muted-foreground/60 hover:text-green-600 transition-colors flex-shrink-0"
        aria-label="Modifier"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={() => onDelete(expense)}
        className="p-2 text-muted-foreground/60 hover:text-red-500 transition-colors flex-shrink-0"
        aria-label="Supprimer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
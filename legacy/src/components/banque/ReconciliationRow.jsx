import React from "react";
import { Check, Link2, Paperclip } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

export default function ReconciliationRow({ tx, sym, onToggle, onMatch }) {
  const isCredit = tx.type === "credit";
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0 bg-white">
      <button
        type="button"
        onClick={() => onToggle(tx)}
        aria-label={tx.reconciled ? "Dépointer l'opération" : "Pointer l'opération"}
        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          tx.reconciled ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300 bg-white"
        }`}
      >
        {tx.reconciled && <Check className="w-3.5 h-3.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tx.description || "Opération"}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span>{tx.date ? tx.date.split("T")[0] : ""}</span>
          {tx.reconciled && !tx.matched_label && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              Pointée
            </span>
          )}
          {tx.matched_label && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 max-w-[190px]">
              <Link2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{tx.matched_label}</span>
            </span>
          )}
        </div>
      </div>

      <p className={`text-sm font-bold flex-shrink-0 ${isCredit ? "text-emerald-600" : "text-foreground"}`}>
        {isCredit ? "+" : "-"}{formatAmount(tx.amount, sym)}
      </p>

      <button
        type="button"
        onClick={() => onMatch(tx)}
        title="Rapprocher un document"
        className={`p-1.5 rounded-lg flex-shrink-0 ${tx.matched_type && tx.matched_type !== "none" ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted"}`}
      >
        <Paperclip className="w-4 h-4" />
      </button>
    </div>
  );
}
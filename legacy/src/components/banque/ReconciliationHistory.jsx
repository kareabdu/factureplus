import React from "react";
import { formatAmount } from "@/lib/formatAmount";

export default function ReconciliationHistory({ items, sym }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60">
        <h3 className="text-sm font-semibold text-foreground">Rapprochements clôturés</h3>
      </div>
      {items.map((r) => {
        const balanced = Math.abs(Number(r.difference) || 0) < 0.5;
        return (
          <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Relevé du {r.statement_date ? r.statement_date.split("T")[0] : "—"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {formatAmount(r.statement_balance, sym)} · {r.unreconciled_count || 0} non pointée{(r.unreconciled_count || 0) > 1 ? "s" : ""}
                {r.notes ? ` · ${r.notes}` : ""}
              </p>
            </div>
            <span
              className={`text-xs font-semibold rounded-full px-2 py-1 flex-shrink-0 ${
                balanced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              Écart {formatAmount(r.difference, sym)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
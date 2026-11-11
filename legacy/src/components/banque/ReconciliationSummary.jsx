import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

export default function ReconciliationSummary({
  bookBalance,
  pointedBalance,
  statementBalance,
  gap,
  unreconciledCount,
  unreconciledNet,
  hasStatement,
  sym,
}) {
  const balanced = Math.abs(gap) < 0.5;

  const cells = [
    { label: "Solde comptable", value: formatAmount(bookBalance, sym), tone: "text-foreground" },
    { label: "Solde pointé", value: formatAmount(pointedBalance, sym), tone: "text-foreground" },
    { label: "Solde du relevé", value: hasStatement ? formatAmount(statementBalance, sym) : "—", tone: "text-foreground" },
    { label: "Écart", value: hasStatement ? formatAmount(gap, sym) : "—", tone: balanced ? "text-emerald-600" : "text-orange-600" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cells.map((c) => (
          <div key={c.label}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{c.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div
        className={`mt-3 rounded-lg px-3 py-2 text-xs flex items-start gap-2 ${
          !hasStatement
            ? "bg-gray-50 text-gray-600"
            : balanced
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {hasStatement && balanced ? (
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        )}
        <span>
          {!hasStatement
            ? "Saisissez le solde du relevé bancaire pour calculer l'écart de rapprochement."
            : balanced
            ? `${unreconciledCount} opération${unreconciledCount > 1 ? "s" : ""} non pointée${unreconciledCount > 1 ? "s" : ""} (${formatAmount(unreconciledNet, sym)}) — rapprochement équilibré.`
            : `Écart de ${formatAmount(gap, sym)} à justifier · ${unreconciledCount} opération${unreconciledCount > 1 ? "s" : ""} non pointée${unreconciledCount > 1 ? "s" : ""} (${formatAmount(unreconciledNet, sym)}).`}
        </span>
      </div>
    </div>
  );
}
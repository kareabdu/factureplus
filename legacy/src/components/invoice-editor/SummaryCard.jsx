import React from "react";
import { ChevronRight } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className={bold ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-semibold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

export default function SummaryCard({ subtotal, total, payments, balanceDue, sym, blMode, tax, hasTaxableItems, onTaxClick }) {
  if (blMode) return null;
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 px-4 py-1">
      <Row label="Sous-total" value={formatAmount(subtotal, sym)} bold />
      {hasTaxableItems && tax && tax.rate > 0 && (
        <button
          type="button"
          onClick={onTaxClick}
          className="w-full flex items-center justify-between py-2.5 text-left group"
        >
          <span className="text-muted-foreground">Taxe ({tax.rate}%)</span>
          <span className="flex items-center gap-1">
            <span className="text-foreground">{formatAmount(tax.taxAmount, sym)}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </span>
        </button>
      )}
      <Row label="Total" value={formatAmount(total, sym)} />
      <div className="border-t border-border/60 my-1" />
      <div className="flex items-center justify-between py-2.5">
        <span className="font-semibold text-foreground">Solde dû</span>
        <span className="font-bold text-emerald-600">{formatAmount(balanceDue, sym)}</span>
      </div>
    </div>
  );
}
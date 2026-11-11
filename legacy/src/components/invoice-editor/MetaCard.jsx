import React from "react";

export default function MetaCard({ invoiceNumber, companyName, date, onDateChange, readOnly }) {
  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-xl font-semibold text-foreground truncate">{invoiceNumber || "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{companyName || "Informations de l'entreprise"}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange?.(e.target.value)}
          disabled={readOnly}
          className="text-xs text-muted-foreground bg-transparent text-right mt-1 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
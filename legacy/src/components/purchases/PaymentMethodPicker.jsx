import React from "react";
import { formatAmount } from "@/lib/formatAmount";

const METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "card", label: "Carte" },
  { value: "credit", label: "Crédit" },
];

export default function PaymentMethodPicker({
  value,
  onChange,
  total = 0,
  paid = 0,
  paidInFull = true,
  onPaidChange,
  onTogglePaidInFull,
  currencySymbol = "",
}) {
  return (
    <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 p-4">
      <p className="text-sm font-semibold text-foreground mb-3">Moyen de paiement</p>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {METHODS.map((m) => {
          const active = value === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange(m.value)}
              className={`h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                active
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "border-black/10 dark:border-white/15 text-muted-foreground"
              }`}
              style={{ minHeight: "unset", minWidth: "unset" }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Payé</span>
        <div className="flex items-center gap-2">
          {paidInFull ? (
            <span className="text-sm font-semibold text-foreground">
              {formatAmount(total, currencySymbol)}
            </span>
          ) : (
            <input
              type="number"
              min="0"
              value={paid}
              onChange={(e) => onPaidChange(e.target.value)}
              className="w-24 h-8 px-2 rounded-lg bg-black/[0.05] dark:bg-white/10 text-right text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          )}
          <button
            type="button"
            onClick={onTogglePaidInFull}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 underline-offset-2 hover:underline"
            style={{ minHeight: "unset", minWidth: "unset" }}
          >
            {paidInFull ? "Montant partiel" : "Payer en totalité"}
          </button>
        </div>
      </div>
    </div>
  );
}
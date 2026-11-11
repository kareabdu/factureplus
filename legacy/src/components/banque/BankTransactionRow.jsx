import React from "react";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Trash2, CheckCircle2, Link2 } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

const CATEGORY_LABELS = {
  virement: "Virement",
  especes: "Espèces",
  cheque: "Chèque",
  frais_bancaire: "Frais bancaire",
  salaire: "Salaire",
  vente: "Vente",
  achat: "Achat",
  impot: "Impôt / Taxe",
  pret: "Prêt",
  autre: "Autre",
};

export default function BankTransactionRow({ tx, sym, onEdit, onDelete }) {
  const isCredit = tx.type === "credit";
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0 bg-white">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-emerald-50" : "bg-orange-50"}`}>
        {isCredit ? <ArrowDownCircle className="w-5 h-5 text-emerald-600" /> : <ArrowUpCircle className="w-5 h-5 text-orange-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
          <span className="truncate">{tx.description || CATEGORY_LABELS[tx.category] || "Opération"}</span>
          {tx.reconciled && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{tx.date ? tx.date.split("T")[0] : ""}</span>
          {tx.account_name && <><span>·</span><span className="truncate">{tx.account_name}</span></>}
          {tx.category && <><span>·</span><span>{CATEGORY_LABELS[tx.category]}</span></>}
        </div>
        {tx.matched_label && (
          <p className="flex items-center gap-1 text-[11px] text-emerald-700 mt-0.5 truncate">
            <Link2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{tx.matched_label}</span>
          </p>
        )}
      </div>
      <p className={`text-sm font-bold flex-shrink-0 ${isCredit ? "text-emerald-600" : "text-foreground"}`}>
        {isCredit ? "+" : "-"}{formatAmount(tx.amount, sym)}
      </p>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => onEdit(tx)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => onDelete(tx)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
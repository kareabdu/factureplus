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

export default function BankTransactionDesktopTable({ transactions, sym, onEdit, onDelete }) {
  return (
    <div className="hidden md:block rounded-2xl border border-border/60 shadow-sm overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="text-left font-medium text-muted-foreground px-4 py-3">Date</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3">Description</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3">Compte</th>
            <th className="text-left font-medium text-muted-foreground px-4 py-3">Catégorie</th>
            <th className="text-right font-medium text-muted-foreground px-4 py-3">Montant</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const isCredit = tx.type === "credit";
            return (
              <tr key={tx.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{tx.date ? tx.date.split("T")[0] : ""}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isCredit
                      ? <ArrowDownCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      : <ArrowUpCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                    <span className="font-medium text-foreground">{tx.description || CATEGORY_LABELS[tx.category] || "Opération"}</span>
                    {tx.reconciled && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                  </div>
                  {tx.matched_label && (
                    <p className="flex items-center gap-1 text-[11px] text-emerald-700 mt-0.5">
                      <Link2 className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{tx.matched_label}</span>
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{tx.account_name || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{tx.category ? CATEGORY_LABELS[tx.category] : "-"}</td>
                <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${isCredit ? "text-emerald-600" : "text-foreground"}`}>
                  {isCredit ? "+" : "-"}{formatAmount(tx.amount, sym)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onEdit(tx)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(tx)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
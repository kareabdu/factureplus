import React from "react";
import { Pencil, Trash2 } from "lucide-react";
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

export default function ExpenseDesktopTable({ expenses, onEdit, onDelete }) {
  return (
    <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Libellé</th>
            <th className="px-4 py-3">Catégorie</th>
            <th className="px-4 py-3">Méthode</th>
            <th className="px-4 py-3 text-right">Montant</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "—"}
              </td>
              <td className="px-4 py-3 font-medium text-foreground">{e.merchant_name || "—"}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.autre}`}>
                  {CATEGORY_LABELS[e.category] || "Autre"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{e.payment_method || "—"}</td>
              <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                {formatAmount(e.amount, e.currency_symbol || "CFA")}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  <button onClick={() => onEdit(e)} className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(e)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
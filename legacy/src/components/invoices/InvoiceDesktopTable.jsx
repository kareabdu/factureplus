import React from "react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

const STATUS_BADGE = {
  draft: { label: "Brouillon", cls: "text-gray-600 bg-gray-100 border-gray-200" },
  sent: { label: "Envoyée", cls: "text-blue-700 bg-blue-50 border-blue-200" },
  paid: { label: "Payée", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  overdue: { label: "En retard", cls: "text-red-600 bg-red-50 border-red-200" },
  cancelled: { label: "Annulée", cls: "text-red-600 bg-red-50 border-red-200" },
  refused: { label: "Refusée", cls: "text-red-600 bg-red-50 border-red-200" },
  accepted: { label: "Acceptée", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

export default function InvoiceDesktopTable({ groups, onRowClick, actionsFor, highlightedId }) {
  return (
    <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Numéro</th>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3 text-right">Montant</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        {groups.map(([year, items]) => {
          const yearTotal = items.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
          const sym = items[0]?.currency_symbol || "CFA";
          return (
            <tbody key={year}>
              <tr className="bg-gray-50/60">
                <td colSpan={6} className="px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{year}</span>
                    <span className="text-xs font-semibold text-foreground">{formatAmount(yearTotal, sym)}</span>
                  </div>
                </td>
              </tr>
              {items.map((inv) => {
                const isPaid = inv.status === "paid";
                const paymentDate = inv.payments?.length ? inv.payments[inv.payments.length - 1].date : inv.payment_date;
                const date = isPaid && paymentDate ? paymentDate : (inv.date || inv.created_date);
                const isOverdue = !!inv.due_date && !isPaid && inv.status !== "cancelled" && inv.status !== "refused" && new Date(inv.due_date) < new Date(new Date().toDateString());
                const badge = isOverdue ? STATUS_BADGE.overdue : STATUS_BADGE[inv.status] || STATUS_BADGE.draft;
                const actions = actionsFor(inv);
                return (
                  <tr
                    key={inv.id}
                    onClick={() => onRowClick(inv)}
                    className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${highlightedId === inv.id ? "bg-emerald-50 ring-2 ring-emerald-300 ring-inset" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{inv.invoice_number || "—"}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{inv.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{date ? format(new Date(date), "dd/MM/yyyy") : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-medium border rounded-full px-2 py-0.5 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                      {formatAmount(inv.total_amount, inv.currency_symbol || "CFA")}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {actions.map((a) => (
                            <DropdownMenuItem
                              key={a.label}
                              onClick={a.onClick}
                              className={a.danger ? "text-red-600 focus:bg-red-50 focus:text-red-600" : ""}
                            >
                              {a.icon && <a.icon className="w-4 h-4 mr-2" />}
                              {a.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
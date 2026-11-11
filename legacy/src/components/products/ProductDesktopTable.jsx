import React from "react";
import { Check, ArrowDownToLine } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";
import InlineStockStepper from "@/components/products/InlineStockStepper";

export default function ProductDesktopTable({ products, categories, locations, currencySymbol, selectedIds, onToggleSelect, onEdit, onMove, onStep, onSetQuantity }) {
  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";
  const locNames = (p) => {
    const ids = [
    ...(p.locations || []).map((l) => l.location_id).filter(Boolean),
    ...(p.location_ids || []).filter(Boolean)];

    const names = ids.map((id) => locations.find((l) => l.id === id)?.name).filter(Boolean);
    if (names.length) return names.join(", ");
    return p.location || "—";
  };

  return (
    <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-[64px]" />
          <col />
          <col className="w-[120px]" />
          <col className="w-[130px]" />
          <col className="w-[150px]" />
          <col className="w-[150px]" />
          <col className="w-[110px]" />
        </colgroup>
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="px-2 py-2.5"></th>
            <th className="px-3 py-2.5">Nom</th>
            <th className="px-3 py-2.5 whitespace-nowrap">Référence</th>
            <th className="px-3 py-2.5 whitespace-nowrap">Catégorie</th>
            <th className="px-3 py-2.5 whitespace-nowrap">Emplacement</th>
            <th className="px-3 py-2.5 whitespace-nowrap">Stock</th>
            <th className="px-3 py-2.5 whitespace-nowrap text-right">Prix</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const selected = selectedIds?.has(p.id);
            return (
              <tr key={p.id} className="group border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleSelect(p.id)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${selected ? "bg-emerald-600 text-white opacity-100 scale-100" : "bg-white border border-gray-400 shadow-sm hover:border-emerald-500 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"}`}
                      style={{ minHeight: "unset", minWidth: "unset" }}
                      aria-label={selected ? "Désélectionner" : "Sélectionner"}>
                      
                      {selected && <Check className="w-3 h-3" strokeWidth={3} />}
                    </button>
                    <button
                      onClick={() => onMove(p)}
                      className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Mouvement de stock"
                      style={{ minHeight: "unset", minWidth: "unset" }}>
                      
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2.5 font-medium text-foreground cursor-pointer" onClick={() => onEdit(p)}>{p.name}</td>
                <td className="px-3 py-2.5 text-gray-600 cursor-pointer truncate" onClick={() => onEdit(p)}>{p.sku || "—"}</td>
                <td className="px-3 py-2.5 text-gray-600 cursor-pointer truncate" onClick={() => onEdit(p)}>{catName(p.category_id)}</td>
                <td className="px-3 py-2.5 text-gray-500 cursor-pointer" onClick={() => onEdit(p)}>{locNames(p)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <InlineStockStepper quantity={p.quantity} onStep={(type) => onStep(p, type)} onSetQuantity={(qty) => onSetQuantity(p, qty)} />
                    {p.unit && <span className="text-xs text-gray-400 whitespace-nowrap">{p.unit}</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap text-sm">
                  {p.unit_price != null ? formatAmount(p.unit_price, currencySymbol) : "—"}
                </td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}
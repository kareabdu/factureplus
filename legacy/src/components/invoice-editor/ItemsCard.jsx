import React, { useRef, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

export default function ItemsCard({ items, onAdd, onEdit, onRemove, sym, readOnly, blMode, scrollSignal }) {
  const lastItemRef = useRef(null);

  // Auto-scroll vers le dernier article quand scrollSignal change (nouvel article ajouté)
  useEffect(() => {
    if (scrollSignal > 0) {
      // Laisse le DOM se peindre avant de défiler
      const t = setTimeout(() => {
        lastItemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [scrollSignal]);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
      {items.length > 0 && (
        <div className="divide-y divide-border/60">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <div key={item.id} ref={isLast ? lastItemRef : null} className="flex items-center justify-between px-4 py-3">
                <button onClick={() => { if (!readOnly) onEdit(item); }} disabled={readOnly} className="flex-1 text-left min-w-0 disabled:opacity-70">
                  <p className="font-medium text-foreground truncate">{item.product_name}</p>
                  <p className="text-sm text-muted-foreground">{blMode ? `${item.quantity} ${item.unit || "Pcs"}` : `${item.quantity} x ${formatAmount(item.unit_price, sym)}`}</p>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {!blMode && <span className="font-semibold text-foreground text-sm">{formatAmount(item.total_price, sym)}</span>}
                  {!readOnly && (
                    <button onClick={() => onRemove(item)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!readOnly && (
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-between px-4 py-3 text-emerald-600 font-medium"
          style={items.length === 0 ? { borderTop: "none" } : { borderTop: "1px dashed #e5e7eb" }}
        >
          <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter un article</span>
          {!blMode && <span className="text-sm text-emerald-600">{formatAmount(0, sym)}</span>}
        </button>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

export default function ProductPickerSheet({ open, onOpenChange, products = [], currencySymbol = "", onPick }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const list = products
    .filter((p) => (p.name || "").toLowerCase().includes(term) || (p.sku || "").toLowerCase().includes(term))
    .slice(0, 60);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-center text-base font-bold">Choisir un produit</DialogTitle>
        </DialogHeader>

        <div className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-3 pb-4 space-y-2">
          {list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onPick(p);
                setQ("");
                onOpenChange(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] text-left active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/[0.05] dark:bg-white/10 flex items-center justify-center shrink-0">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  Stock : {p.quantity ?? 0} {p.unit || ""}
                </p>
              </div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                {formatAmount(p.cost_price ?? 0, currencySymbol)}
              </span>
            </button>
          ))}

          {list.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun produit trouvé</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
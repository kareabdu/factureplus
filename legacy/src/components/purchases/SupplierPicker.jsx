import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Building2, Check } from "lucide-react";

export default function SupplierPicker({ open, onOpenChange, suppliers = [], valueId, onSelect }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const list = suppliers.filter((s) => (s.name || "").toLowerCase().includes(term));

  const pick = (supplier) => {
    onSelect(supplier);
    onOpenChange(false);
    setQ("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-center text-base font-bold">Choisir un fournisseur</DialogTitle>
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
          <button
            type="button"
            onClick={() => pick(null)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] text-left active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-black/[0.05] dark:bg-white/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">Aucun fournisseur</span>
            {!valueId && <Check className="w-4 h-4 text-emerald-600" />}
          </button>

          {list.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] text-left active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-black/[0.05] dark:bg-white/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                {s.phone && <p className="text-xs text-muted-foreground truncate">{s.phone}</p>}
              </div>
              {valueId === s.id && <Check className="w-4 h-4 text-emerald-600" />}
            </button>
          ))}

          {list.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun fournisseur trouvé</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
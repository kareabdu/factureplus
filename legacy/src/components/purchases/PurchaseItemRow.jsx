import React from "react";
import { Minus, Plus, Package, Trash2 } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";
import { lineTotal } from "@/lib/purchase";

export default function PurchaseItemRow({ item, currencySymbol = "", onQuantity, onPrice, onRemove }) {
  const qty = Number(item.quantity) || 0;

  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/[0.05] dark:bg-white/10 flex items-center justify-center shrink-0">
          {item.product?.image_url ? (
            <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
            {item.product_name}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Stock : {item.product?.quantity ?? 0} {item.unit || ""}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onQuantity(Math.max(1, qty - 1))}
                className="w-7 h-7 rounded-lg bg-black/[0.05] dark:bg-white/10 flex items-center justify-center active:scale-95"
                style={{ minHeight: "unset", minWidth: "unset" }}
                aria-label="Diminuer"
              >
                <Minus className="w-3.5 h-3.5 text-foreground" />
              </button>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => onQuantity(e.target.value)}
                className="w-11 h-7 text-center text-sm font-semibold bg-transparent text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => onQuantity(qty + 1)}
                className="w-7 h-7 rounded-lg bg-black/[0.05] dark:bg-white/10 flex items-center justify-center active:scale-95"
                style={{ minHeight: "unset", minWidth: "unset" }}
                aria-label="Augmenter"
              >
                <Plus className="w-3.5 h-3.5 text-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-1 ml-1">
              <input
                type="number"
                min="0"
                value={item.unit_price}
                onChange={(e) => onPrice(e.target.value)}
                className="w-20 h-7 px-1.5 rounded-lg bg-black/[0.05] dark:bg-white/10 text-right text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[11px] text-muted-foreground">{currencySymbol}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {formatAmount(lineTotal(item), currencySymbol)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            style={{ minHeight: "unset", minWidth: "unset" }}
            aria-label="Retirer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
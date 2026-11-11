import React from "react";
import { Check, Package as PackageIcon, ArrowDownToLine, ChevronRight } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";
import InlineStockStepper from "./InlineStockStepper";

const WA_GREEN = "#25D366";

const STATUS = {
  safe: {
    label: "OK",
    badge: "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  low: {
    label: "Bas",
    badge: "text-amber-700 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  out: {
    label: "Rupture",
    badge: "text-red-600 bg-red-50 dark:bg-red-500/15 dark:text-red-400",
    dot: "bg-red-500",
  },
};

export default function ProductCard({
  product,
  currencySymbol = "",
  selected = false,
  onToggleSelect,
  onStep,
  onSetQuantity,
  onEdit,
  onOpen,
  onMove,
}) {
  const qty = Number(product.quantity) || 0;
  const reorder = Number(product.reorder_level) || 0;
  const statusKey = qty <= 0 ? "out" : qty <= reorder ? "low" : "safe";
  const status = STATUS[statusKey];

  const handleClick = () => (onOpen ? onOpen(product) : onEdit?.(product));

  const handleToggle = (e) => {
    e.stopPropagation();
    onToggleSelect?.();
  };

  const handleMove = (e) => {
    e.stopPropagation();
    onMove?.(product);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative cursor-pointer rounded-2xl bg-card border shadow-sm transition-all active:scale-[0.98] ${
        selected ? "border-emerald-600" : "border-black/5 dark:border-white/10"
      }`}
    >
      <div className="p-3 flex items-start gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className="relative shrink-0 mt-0.5"
          style={{ minHeight: "unset", minWidth: "unset" }}
          aria-label={selected ? "Désélectionner" : "Sélectionner"}
        >
          <div
            className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-black/[0.05] dark:bg-white/10"
            style={selected ? { boxShadow: `0 0 0 2px ${WA_GREEN}` } : undefined}
          >
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <PackageIcon className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          {selected && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-card"
              style={{ backgroundColor: WA_GREEN }}
            >
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="flex-1 font-semibold text-sm text-foreground leading-tight line-clamp-2">
              {product.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold shrink-0 ${status.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Stock : {qty}
            {product.unit ? ` · ${product.unit}` : ""}
          </p>
          {product.unit_price != null && (
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              {formatAmount(product.unit_price, currencySymbol)}
            </p>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/50 mt-4 shrink-0" />
      </div>

      <div className="border-t border-black/5 dark:border-white/10 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <InlineStockStepper
            quantity={product.quantity}
            onStep={(type) => onStep(product, type)}
            onSetQuantity={(q) => onSetQuantity(product, q)}
          />
          {product.unit && (
            <span className="text-[11px] text-muted-foreground shrink-0">{product.unit}</span>
          )}
        </div>
        {onMove && (
          <button
            type="button"
            onClick={handleMove}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition shrink-0"
            style={{ minHeight: "unset", minWidth: "unset" }}
            aria-label="Réapprovisionner"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Réappro
          </button>
        )}
      </div>
    </div>
  );
}
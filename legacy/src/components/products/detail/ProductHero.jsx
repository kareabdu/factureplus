import React from "react";
import { Package as PackageIcon, Pencil } from "lucide-react";

const STATUS = {
  safe: {
    label: "En stock",
    badge: "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  low: {
    label: "Stock bas",
    badge: "text-amber-700 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  out: {
    label: "Rupture",
    badge: "text-red-600 bg-red-50 dark:bg-red-500/15 dark:text-red-400",
    dot: "bg-red-500",
  },
};

export function getStockStatus(product) {
  const qty = Number(product?.quantity) || 0;
  const reorder = Number(product?.reorder_level) || 0;
  return { key: qty <= 0 ? "out" : qty <= reorder ? "low" : "safe", qty };
}

export default function ProductHero({ product, categoryName, onEdit }) {
  const { key, qty } = getStockStatus(product);
  const status = STATUS[key];
  const meta = [product.sku, categoryName].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 shadow-sm p-4 flex items-start gap-3">
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/[0.05] dark:bg-white/10 flex items-center justify-center shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <PackageIcon className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold leading-tight text-foreground line-clamp-2">
          {product.name}
        </h1>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {meta || "Sans référence"}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold ${status.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {qty} {product.unit || ""}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 w-9 h-9 rounded-full bg-black/[0.05] dark:bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
        style={{ minHeight: "unset", minWidth: "unset" }}
        aria-label="Modifier"
      >
        <Pencil className="w-4 h-4 text-foreground" />
      </button>
    </div>
  );
}
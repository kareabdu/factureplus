import React from "react";
import { ChevronRight } from "lucide-react";

export default function InfoRow({
  label,
  value,
  onClick,
  chevron = false,
  accent = false,
  strong = false,
  last = false,
  className = "",
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
        last ? "" : "border-b border-black/5 dark:border-white/10"
      } ${onClick ? "active:bg-black/[0.03] dark:active:bg-white/5 transition-colors" : ""} ${className}`}
      style={onClick ? { minHeight: "unset", minWidth: "unset" } : undefined}
    >
      <span
        className={`text-sm shrink-0 ${
          accent
            ? "font-semibold text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
      {value !== undefined && value !== null && (
        <span
          className={`ml-auto text-sm text-right truncate ${
            strong ? "font-semibold text-foreground" : "text-foreground"
          }`}
        >
          {value}
        </span>
      )}
      {chevron && <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
    </Comp>
  );
}
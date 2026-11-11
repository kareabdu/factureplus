import React, { useState } from "react";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "lucide-react";

const PRESETS = [
  { key: "all", label: "Tout" },
  { key: "7d", label: "7 jours" },
  { key: "month", label: "Ce mois" },
  { key: "year", label: "Cette année" },
  { key: "custom", label: "Période" },
];

function rangeFor(key) {
  const now = new Date();
  switch (key) {
    case "7d":
      return { start: format(subDays(now, 6), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    case "month":
      return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
    case "year":
      return { start: format(startOfYear(now), "yyyy-MM-dd"), end: format(endOfYear(now), "yyyy-MM-dd") };
    default:
      return { start: null, end: null };
  }
}

export default function ExpenseFilters({ value, onChange }) {
  const [preset, setPreset] = useState(value?.preset || "all");
  const [start, setStart] = useState(value?.start || "");
  const [end, setEnd] = useState(value?.end || "");

  const apply = (p, s, e) => {
    setPreset(p); setStart(s); setEnd(e);
    if (p === "custom") onChange({ preset: p, start: s || null, end: e || null });
    else onChange({ preset: p, ...rangeFor(p) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {PRESETS.map((p) => {
          const active = preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => apply(p.key, start, end)}
              className={`shrink-0 px-3.5 h-9 rounded-full text-sm font-medium transition-colors ${
                active ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={start}
            onChange={(e) => apply("custom", e.target.value, end)}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <input
            type="date"
            value={end}
            onChange={(e) => apply("custom", start, e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground"
          />
        </div>
      )}
    </div>
  );
}
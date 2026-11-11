import React from "react";
import { Search } from "lucide-react";

export default function StockToolbar({
  searchTerm,
  setSearchTerm,
  categories = [],
  products = [],
  selectedCategory,
  setSelectedCategory,
  locations = [],
  selectedLocation,
  setSelectedLocation,
}) {
  const countFor = (id) =>
    id === "all"
      ? products.length
      : products.filter((p) => p.category_id === id).length;

  const pills = [{ id: "all", name: "Toutes" }, ...categories];

  return (
    <div className="mb-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un article"
          className="w-full h-11 pl-10 pr-3 rounded-2xl bg-card border border-black/5 dark:border-white/10 text-sm text-foreground placeholder:text-muted-foreground shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2.5 -mx-1 px-1 py-0.5">
        {pills.map((c) => {
          const active = selectedCategory === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                active
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15"
                  : "border-black/10 dark:border-white/15 text-muted-foreground bg-card"
              }`}
              style={{ minHeight: "unset", minWidth: "unset" }}
            >
              {c.name} ({countFor(c.id)})
            </button>
          );
        })}
      </div>

      {locations.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-2 -mx-1 px-1 pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedLocation("all")}
            className={`h-7 px-3 rounded-full text-[11px] font-medium whitespace-nowrap transition border ${
              !selectedLocation || selectedLocation === "all"
                ? "border-emerald-600/60 text-emerald-700 dark:text-emerald-400"
                : "border-black/10 dark:border-white/15 text-muted-foreground"
            }`}
            style={{ minHeight: "unset", minWidth: "unset" }}
          >
            Tous les emplacements
          </button>
          {locations.map((loc) => {
            const active = selectedLocation === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedLocation(active ? "all" : loc.id)}
                className={`h-7 px-3 rounded-full text-[11px] font-medium whitespace-nowrap transition border ${
                  active
                    ? "border-emerald-600/60 text-emerald-700 dark:text-emerald-400"
                    : "border-black/10 dark:border-white/15 text-muted-foreground"
                }`}
                style={{ minHeight: "unset", minWidth: "unset" }}
              >
                {loc.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
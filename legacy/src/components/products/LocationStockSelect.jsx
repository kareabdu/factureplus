import React from "react";

// Sélecteur d'emplacements pour la fiche article (création / modification).
// La quantité totale du produit est automatiquement synchronisée avec la
// somme des quantités par emplacement (géré par le formulaire parent).
//
// Props:
//   value            — tableau locations [{ location_id, quantity }]
//   onChange(entries)
//   locations       — emplacements disponibles [{ id, name }]
export default function LocationStockSelect({
  value = [],
  onChange,
  locations = [],
  className = "",
}) {
  const entries = Array.isArray(value) ? value.filter((e) => e && e.location_id) : [];

  const isSelected = (id) => entries.some((e) => e.location_id === id);
  const getQty = (id) => entries.find((e) => e.location_id === id)?.quantity ?? 0;

  const toggle = (id) => {
    const next = isSelected(id)
      ? entries.filter((e) => e.location_id !== id)
      : [...entries, { location_id: id, quantity: 0 }];
    onChange(next);
  };

  const setQty = (id, qty) => {
    const next = entries.map((e) =>
      e.location_id === id ? { ...e, quantity: qty === "" ? 0 : Number(qty) } : e
    );
    onChange(next);
  };

  if (!locations.length) {
    return (
      <p className="text-xs text-gray-400">
        Aucun emplacement. Créez-en depuis la page Emplacements.
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {locations.map((loc) => {
        const sel = isSelected(loc.id);
        if (sel) {
          return (
            <div
              key={loc.id}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white pl-3 pr-1 py-1"
            >
              <button
                type="button"
                onClick={() => toggle(loc.id)}
                className="text-sm font-medium leading-none"
              >
                {loc.name}
              </button>
              <input
                type="number"
                min="0"
                step="0.01"
                value={getQty(loc.id) || ""}
                onChange={(e) => setQty(loc.id, e.target.value)}
                placeholder="Qté"
                className="w-16 bg-emerald-700/40 text-white text-right text-sm px-2 py-1 rounded-full placeholder-white/60 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          );
        }
        return (
          <button
            key={loc.id}
            type="button"
            onClick={() => toggle(loc.id)}
            className="px-3 py-1.5 rounded-full text-sm border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {loc.name}
          </button>
        );
      })}
    </div>
  );
}
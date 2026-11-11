import React, { useEffect } from "react";

/**
 * Multi-location picker for an invoice item (chip style, aligned with the
 * Products form). Lets the user split the item quantity across several stock
 * locations. Aucun contrôle : la répartition par emplacement est libre.
 *
 * Si le produit n'est stocké que dans un seul emplacement, le sélecteur est
 * masqué et la quantité est automatiquement affectée à cet emplacement.
 *
 * Props:
 *   value             — allocations array [{ location_id, quantity }]
 *   onChange(allocs)  — called with the updated allocations array
 *   productLocations  — product.locations array [{ location_id, quantity }]
 *   locations        — all Location entities [{ id, name }]
 *   itemQuantity      — item quantity (used to auto-fill the single location)
 */
export default function ItemLocationSelect({
  value = [],
  onChange,
  productLocations = [],
  locations = [],
  itemQuantity,
}) {
  const entries = Array.isArray(productLocations)
    ? productLocations.filter((e) => e && e.location_id)
    : [];

  // Produit localisé dans un seul emplacement : on masque le sélecteur et on
  // affecte automatiquement toute la quantité à cet emplacement.
  useEffect(() => {
    if (entries.length !== 1) return;
    const id = entries[0].location_id;
    const q = Math.max(0, parseFloat(itemQuantity) || 0);
    const cur = (Array.isArray(value) ? value : []).find((a) => a && a.location_id === id);
    if (!cur || (parseFloat(cur.quantity) || 0) !== q) {
      onChange([{ location_id: id, quantity: q }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length, itemQuantity]);

  const allocs = Array.isArray(value) ? value.filter((a) => a && a.location_id) : [];
  const getQty = (id) => parseFloat(allocs.find((a) => a.location_id === id)?.quantity) || 0;
  const isSelected = (id) => allocs.some((a) => a.location_id === id);
  const nameOf = (id) => locations.find((l) => l.id === id)?.name || "Emplacement";
  const stockOf = (id) => entries.find((e) => e.location_id === id)?.quantity ?? 0;
  const totalStock = entries.reduce((s, e) => s + (e.quantity ?? 0), 0);
  const totalSelected = allocs.reduce((s, a) => s + (parseFloat(a.quantity) || 0), 0);

  // Produit sans emplacement configuré : rien à afficher.
  if (entries.length === 0) return null;

  // Produit stocké dans un seul emplacement : affichage lecture seule
  // (la quantité est automatiquement affectée à cet emplacement via le
  // useEffect ci-dessus).
  if (entries.length === 1) {
    const e = entries[0];
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-900">Emplacement</p>
        <div className="inline-flex items-center rounded-full pl-3 pr-3 py-1 bg-emerald-600 text-white">
          <span className="text-sm font-medium leading-none">
            {nameOf(e.location_id)}
            <span className="ml-1 text-xs text-white/70">(stock {e.quantity ?? 0})</span>
          </span>
        </div>
      </div>
    );
  }

  const toggle = (id) => {
    if (isSelected(id)) {
      onChange(allocs.filter((a) => a.location_id !== id));
    } else {
      onChange([...allocs, { location_id: id, quantity: 0 }]);
    }
  };

  const setQty = (id, qty) => {
    const parsed = qty === "" ? 0 : Math.max(0, parseInt(qty, 10) || 0);
    onChange(
      allocs.map((a) =>
        a.location_id === id ? { ...a, quantity: parsed } : a
      )
    );
  };

  const sumExceeds = totalSelected > totalStock;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900">Emplacements</p>
      <div className="flex flex-wrap gap-2">
        {entries.map((pl) => {
          const sel = isSelected(pl.location_id);
          const qty = getQty(pl.location_id);
          const locError = sel && qty > stockOf(pl.location_id);
          if (sel) {
            return (
              <div
                key={pl.location_id}
                className={`inline-flex items-center gap-1 rounded-full pl-3 pr-1 py-1 ${
                  locError ? "bg-red-600" : "bg-emerald-600"
                } text-white`}
              >
                <button
                  type="button"
                  onClick={() => toggle(pl.location_id)}
                  className="text-sm font-medium leading-none"
                >
                  {nameOf(pl.location_id)}
                  <span className="ml-1 text-xs text-white/70">(stock {stockOf(pl.location_id)})</span>
                </button>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={qty || ""}
                  onChange={(e) => setQty(pl.location_id, e.target.value)}
                  placeholder="Qté"
                  className={`w-16 text-white text-right text-sm px-2 py-1 rounded-full placeholder-white/60 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    locError ? "bg-red-700/40" : "bg-emerald-700/40"
                  }`}
                />
              </div>
            );
          }
          return (
            <button
              key={pl.location_id}
              type="button"
              onClick={() => toggle(pl.location_id)}
              className="px-3 py-1.5 rounded-full text-sm border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {nameOf(pl.location_id)}
              <span className="ml-1 text-xs text-gray-400">(stock {stockOf(pl.location_id)})</span>
            </button>
          );
        })}
      </div>
      {sumExceeds && (
        <p className="text-xs text-red-600 font-medium">
          La somme des quantités ({totalSelected}) dépasse le stock actuel ({totalStock}).
        </p>
      )}
    </div>
  );
}
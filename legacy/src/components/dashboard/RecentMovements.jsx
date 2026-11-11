import React from 'react';
import { ArrowDownLeft, ArrowUpLeft, RefreshCw } from "lucide-react";

export default function RecentMovements({ movements }) {
  // Déduplication : regroupe les mouvements d'une même facture (reference) par
  // type ET par produit. Une facture avec 3 mouvements "out" sur le même produit
  // -> 1 seule entrée avec la quantité totale.
  const deduped = (() => {
    const map = new Map();
    for (const m of movements) {
      // Ignore les entrées de réinjection de stock (suppression/réduction d'article
      // sur une facture) : ce ne sont pas de vrais mouvements d'approvisionnement.
      if (m.movement_type === "in" && m.reason === "Ajustement quantité / suppression article") continue;
      // Les ajustements (saisie manuelle) restent individuels : on ne les regroupe pas.
      const key = m.movement_type === "adjustment" ? `adj#${m.id}` : `${m.reference || ""}#${m.movement_type}#${m.product_id || ""}`;
      if (!map.has(key)) {
        map.set(key, { ...m, _count: 1 });
      } else {
        const e = map.get(key);
        e.quantity += m.quantity || 0;
        e._count += 1;
        if (new Date(m.created_date) > new Date(e.created_date)) e.created_date = m.created_date;
      }
    }
    return Array.from(map.values());
  })();

  const getIcon = (type) => {
    switch (type) {
      case 'in': return { Icon: ArrowUpLeft, bg: "#E6F4EE", color: "#228B59" };
      case 'out': return { Icon: ArrowDownLeft, bg: "#FBE9E7", color: "#D32F2F" };
      case 'adjustment': return { Icon: RefreshCw, bg: "#E8EDFB", color: "#3A64D4" };
      default: return { Icon: ArrowDownLeft, bg: "#FBE9E7", color: "#D32F2F" };
    }
  };

  const fmtDate = (d) => {
    try {
      const dt = new Date(d);
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(dt.getDate())}-${pad(dt.getMonth() + 1)}-${dt.getFullYear()} ${pad(dt.getHours())}h${pad(dt.getMinutes())}`;
    } catch { return ""; }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h2 className="text-base font-bold text-foreground mb-4">Mouvements récents</h2>
      {deduped.length === 0 ? (
        <p className="text-center text-gray-400 py-6 text-sm">Aucun mouvement</p>
      ) : (
        <div className="space-y-3">
          {deduped.slice(0, 10).map((m) => {
            const { Icon, bg, color } = getIcon(m.movement_type);
            const qty = m.quantity || 0;
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{m.product_name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {m.movement_type === "adjustment"
                      ? `${m.previous_quantity ?? 0} → ${m.new_quantity ?? qty}`
                      : `${m.reference || "—"} · ${qty} unité${qty > 1 ? "s" : ""}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(m.created_date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
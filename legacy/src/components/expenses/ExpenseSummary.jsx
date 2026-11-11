import React from "react";
import { Wallet, Receipt, Tag, TrendingUp } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

const CATEGORY_LABELS = {
  loyer: "Loyer",
  salaire: "Salaire",
  fournitures: "Fournitures",
  transport: "Transport",
  facture: "Facture",
  impot: "Impôt",
  autre: "Autre",
};

const CATEGORY_DOT = {
  loyer: "bg-purple-500",
  salaire: "bg-blue-500",
  fournitures: "bg-orange-500",
  transport: "bg-cyan-500",
  facture: "bg-yellow-500",
  impot: "bg-red-500",
  autre: "bg-gray-400",
};

export default function ExpenseSummary({ expenses, sym = "CFA" }) {
  const count = expenses.length;
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const avg = count ? total / count : 0;

  // Répartition par catégorie
  const byCat = {};
  expenses.forEach((e) => {
    const c = e.category || "autre";
    byCat[c] = (byCat[c] || 0) + (Number(e.amount) || 0);
  });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const topCat = cats[0];

  const cards = [
    { label: "Total dépenses", value: formatAmount(total, sym), icon: Wallet, accent: "bg-emerald-50 text-emerald-600" },
    { label: "Nombre", value: String(count), icon: Receipt, accent: "bg-blue-50 text-blue-600" },
    { label: "Moyenne / dépense", value: formatAmount(avg, sym), icon: TrendingUp, accent: "bg-orange-50 text-orange-600" },
    { label: "Catégorie principale", value: topCat ? CATEGORY_LABELS[topCat[0]] || "Autre" : "—", icon: Tag, accent: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.accent}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-xs text-gray-500 font-medium truncate">{c.label}</span>
              </div>
              <p className="text-base font-bold text-foreground truncate">{c.value}</p>
            </div>
          );
        })}
      </div>

      {cats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Répartition par catégorie</p>
          <div className="space-y-2.5">
            {cats.map(([cat, amt]) => {
              const pct = total ? (amt / total) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24 shrink-0">{CATEGORY_LABELS[cat] || "Autre"}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${CATEGORY_DOT[cat] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-28 text-right shrink-0">{formatAmount(amt, sym)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
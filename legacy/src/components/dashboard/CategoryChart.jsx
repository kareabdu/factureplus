import React from 'react';
import { formatAmount } from "@/lib/formatAmount";

export default function CategoryChart({ products, categories, currencySymbol = "" }) {
  const data = categories.map((category) => {
    const categoryProducts = products.filter(p => p.category_id === category.id);
    const totalValue = categoryProducts.reduce((sum, p) => sum + (p.quantity * (p.unit_price || 0)), 0);
    return { name: category.name, value: totalValue, count: categoryProducts.length };
  }).filter(d => d.value > 0);

  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h2 className="text-base font-bold text-foreground mb-4">Valeur stock par catégorie</h2>
      {data.length === 0 ? (
        <p className="text-center text-gray-400 py-6 text-sm">Aucune donnée</p>
      ) : (
        <div className="space-y-4">
          {data.map((d) => (
            <div key={d.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-foreground">{d.name}</span>
                <span className="text-sm font-bold text-foreground">{formatAmount(d.value, currencySymbol)}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${Math.max((d.value / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
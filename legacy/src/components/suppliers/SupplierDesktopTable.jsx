import React from "react";
import { Pencil, Trash2 } from "lucide-react";

export default function SupplierDesktopTable({ suppliers, productCounts, onEdit, onDelete, onViewArticles }) {
  return (
    <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Téléphone</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3 text-right">Articles</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => {
            const count = productCounts.get(s.name) || 0;
            return (
              <tr key={s.id} onClick={() => onViewArticles?.(s)} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.contact_person || "—"}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.phone || "—"}</td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-[16rem]">{s.email || "—"}</td>
                <td className="px-4 py-3 text-right text-gray-600">{count}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(s)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
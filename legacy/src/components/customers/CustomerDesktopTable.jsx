import React from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function CustomerDesktopTable({ customers, stats, fmt, onRowClick, actionsFor }) {
  return (
    <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3">Téléphone</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3 text-right">Factures</th>
            <th className="px-4 py-3 text-right">Cumul</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => {
            const s = stats.get(c.name) || { count: 0, total: 0, sym: "CFA" };
            const actions = actionsFor(c);
            return (
              <tr
                key={c.id}
                onClick={() => onRowClick(c)}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.phone || "—"}</td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-[16rem]">{c.email || "—"}</td>
                <td className="px-4 py-3 text-right text-gray-600">{s.count}</td>
                <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">{fmt(s.total, s.sym)}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {actions.map((a) => (
                        <DropdownMenuItem
                          key={a.label}
                          onClick={a.onClick}
                          className={a.danger ? "text-red-600 focus:bg-red-50 focus:text-red-600" : ""}
                        >
                          {a.icon && <a.icon className="w-4 h-4 mr-2" />}
                          {a.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
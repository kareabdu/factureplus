import React, { useState, useEffect, useRef } from "react";
import { Customer } from "@/entities/all";
import { Search, Plus } from "lucide-react";
import { getTeamId } from "@/lib/team";

export default function ClientAutocomplete({ customerName, onSelect, readOnly }) {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  useEffect(() => {
    Customer.list().then(setCustomers);
  }, []);

  useEffect(() => {
    setQuery(customerName && customerName !== "Client de passage" ? customerName : "");
  }, [customerName]);

  const q = query.toLowerCase();
  const filtered = customers
    .filter((c) => (c.name || "").toLowerCase().includes(q))
    .slice(0, 8);
  const trimmed = query.trim();
  const exactMatch = trimmed && customers.some((c) => (c.name || "").toLowerCase() === trimmed.toLowerCase());

  const choose = (c) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onSelect({ name: c.name, phone: c.phone || "", address: c.address || "" });
    setQuery(c.name);
    setOpen(false);
  };

  const create = async () => {
    if (!trimmed) return;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    const created = await Customer.create({ name: trimmed, team_id: await getTeamId() });
    setCustomers((prev) => [...prev, created]);
    onSelect({ name: created.name, phone: "", address: "" });
    setQuery(created.name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-4 py-3">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          value={query}
          readOnly={readOnly}
          onChange={(e) => { if (readOnly) return; setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (!readOnly) setOpen(true); }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => {
              setOpen(false);
              setQuery(customerName && customerName !== "Client de passage" ? customerName : "");
            }, 150);
          }}
          placeholder="Rechercher ou saisir un client"
          className={`flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 ${readOnly ? "opacity-60 cursor-default" : ""}`}
        />
      </div>
      {open && !readOnly && (filtered.length > 0 || (trimmed && !exactMatch)) && (
        <div className="absolute z-30 left-0 right-0 top-full bg-white border border-gray-100 shadow-lg max-h-64 overflow-y-auto rounded-b-xl">
          {trimmed && !exactMatch && (
            <button onMouseDown={(e) => { e.preventDefault(); create(); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 text-left">
              <Plus className="w-4 h-4" /> Créer « {trimmed} »
            </button>
          )}
          {filtered.map((c) => (
            <button key={c.id} onMouseDown={(e) => { e.preventDefault(); choose(c); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-900 hover:bg-gray-50">
              {c.name}
              {c.phone && <span className="text-xs text-gray-400 ml-2">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
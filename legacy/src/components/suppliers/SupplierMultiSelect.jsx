import React, { useState, useEffect } from "react";
import { Supplier } from "@/entities/all";
import SearchableSelect from "@/components/SearchableSelect";
import { X } from "lucide-react";
import { getTeamId } from "@/lib/team";

/**
 * Multi-select de fournisseurs pour un produit.
 * value: array of { supplier_id?, name, reference }
 * onChange(newArray)
 *
 * Les fournisseurs sont liés à la fiche Fournisseur (entité Supplier) :
 * un fournisseur saisi est créé automatiquement pour être réutilisé
 * sur les autres articles / BL / factures du même fournisseur.
 */
export default function SupplierMultiSelect({ value = [], onChange, className = "" }) {
  const [suppliers, setSuppliers] = useState([]);
  const [adding, setAdding] = useState("");

  const loadSuppliers = () => {
    Supplier.list().then(setSuppliers).catch(() => {});
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const addExisting = (supplier) => {
    if (value.some((s) => (s.name || "").toLowerCase() === supplier.name.toLowerCase())) return;
    onChange([...value, { supplier_id: supplier.id, name: supplier.name, reference: "" }]);
  };

  const addNew = async (name) => {
    const n = (name || "").trim();
    if (!n) return;
    if (value.some((s) => (s.name || "").toLowerCase() === n.toLowerCase())) return;
    const existing = suppliers.find((s) => s.name.toLowerCase() === n.toLowerCase());
    if (existing) {
      addExisting(existing);
      return;
    }
    try {
      const created = await Supplier.create({ name: n, team_id: await getTeamId() });
      loadSuppliers();
      onChange([...value, { supplier_id: created.id, name: n, reference: "" }]);
    } catch {
      onChange([...value, { name: n, reference: "" }]);
    }
  };

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));
  const updateRef = (idx, reference) =>
  onChange(value.map((s, i) => i === idx ? { ...s, reference } : s));

  const available = suppliers.filter(
    (s) => !value.some((v) => (v.name || "").toLowerCase() === s.name.toLowerCase())
  );

  return (
    <div className={className}>
      {value.length > 0 &&
      <div className="space-y-1.5 mb-2">
          {value.map((s, i) =>
        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg pl-3 pr-1.5 py-1.5 hidden">
              <span className="flex-1 text-sm font-medium text-gray-800 truncate">{s.name}</span>
              <input
            value={s.reference || ""}
            onChange={(e) => updateRef(i, e.target.value)}
            placeholder="Réf."
            className="w-24 text-xs text-gray-600 bg-transparent outline-none border-0 placeholder:text-gray-400" />
          
              <button
            type="button"
            onClick={() => remove(i)}
            className="text-gray-400 hover:text-red-500 p-0.5"
            aria-label="Retirer">
            
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
        )}
        </div>
      }
      <SearchableSelect
        value={adding}
        placeholder="Ajouter un fournisseur..."
        items={available.map((s) => ({ value: s.id, label: s.name }))}
        onChange={(text) => setAdding(text)}
        onSelect={(item) => {
          const supplier = suppliers.find((s) => s.id === item.value);
          if (supplier) addExisting(supplier);
          setAdding("");
        }} />
      
      {adding.trim() &&
      !suppliers.some((s) => s.name.toLowerCase() === adding.trim().toLowerCase()) &&
      !value.some((v) => (v.name || "").toLowerCase() === adding.trim().toLowerCase()) &&
      <button
        type="button"
        onClick={() => {
          addNew(adding);
          setAdding("");
        }}
        className="mt-1 text-xs text-blue-600 hover:underline">
        
            + Ajouter « {adding.trim()} »
          </button>
      }
    </div>);

}
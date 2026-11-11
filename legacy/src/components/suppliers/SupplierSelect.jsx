import React, { useState, useEffect } from "react";
import { Supplier } from "@/entities/all";
import SearchableSelect from "@/components/SearchableSelect";

export default function SupplierSelect({ value, onChange, className = "" }) {
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    Supplier.list().then(setSuppliers).catch(() => {});
  }, []);

  return (
    <SearchableSelect
      value={value || ""}
      placeholder="Saisir ou choisir..."
      items={suppliers.map((s) => ({ value: s.id, label: s.name }))}
      onChange={(text) => onChange(text)}
      onSelect={(item) => onChange(item.label)}
      className={className}
    />
  );
}
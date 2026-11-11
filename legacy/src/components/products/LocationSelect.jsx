import React from "react";

export default function LocationSelect({ value = [], onChange, locations = [], className = "" }) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((v) => v !== id));
    } else {
      onChange([...selected, id]);
    }
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
        const active = selected.includes(loc.id);
        return (
          <button
            key={loc.id}
            type="button"
            onClick={() => toggle(loc.id)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              active
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {loc.name}
          </button>
        );
      })}
    </div>
  );
}
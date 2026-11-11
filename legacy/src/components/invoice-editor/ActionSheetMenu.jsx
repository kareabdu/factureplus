import React from "react";

export default function ActionSheetMenu({ open, onClose, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-auto p-3" style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}>
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-2xl">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => { a.onClick(); onClose(); }}
              className={`w-full text-center px-4 py-3.5 text-base ${a.danger ? "text-red-500 font-semibold" : a.bold ? "text-gray-900 font-semibold" : "text-gray-900"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="h-2" />
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
          <button onClick={onClose} className="w-full text-center px-4 py-3.5 text-base text-gray-900 font-medium">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
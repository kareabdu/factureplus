import React from "react";
import { Receipt } from "lucide-react";

export default function EmptyState({ onManual, onScan, scanning }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6 py-10"
      style={{ minHeight: "60vh" }}
    >
      <div className="w-24 h-24 rounded-3xl bg-green-50 flex items-center justify-center mb-8">
        <Receipt className="w-12 h-12 text-green-600" strokeWidth={1.5} />
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-2">Suivi des dépenses</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-8">
        Ajoutez vos dépenses et suivez vos sorties d'argent au quotidien
      </p>

      <button
        onClick={onManual}
        className="w-full max-w-xs flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg transition-all"
      >
        Ajouter une dépense
      </button>
      {onScan && (
        <button
          onClick={onScan}
          disabled={scanning}
          className="w-full max-w-xs flex items-center justify-center gap-2 border border-green-600 text-green-700 font-semibold py-3 px-6 rounded-xl transition-all mt-3 disabled:opacity-60"
        >
          {scanning ? "Analyse du reçu..." : "Scanner un reçu"}
        </button>
      )}
    </div>
  );
}
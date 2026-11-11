import React, { useState, useRef, useEffect } from "react";
import { Minus, Plus } from "lucide-react";

/**
 * Stepper inline `− quantité +` à mise à jour instantanée (optimiste).
 * - `onStep(type)` reçoit "in" (＋1) ou "out" (−1).
 * - `onSetQuantity(qty)` est appelé quand l'utilisateur saisit directement
 *   la quantité (tap sur le chiffre → champ de saisie → validation).
 * La quantité affichée est pilotée par le parent (déjà mise à jour de façon optimiste).
 */
export default function InlineStockStepper({ quantity, onStep, onSetQuantity }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(quantity ?? 0));
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(String(quantity ?? 0));
  }, [quantity, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const val = parseFloat(draft);
    if (Number.isNaN(val) || val < 0) {
      setDraft(String(quantity ?? 0));
      return;
    }
    const rounded = Math.round(val * 100) / 100;
    if (rounded !== (quantity ?? 0) && onSetQuantity) {
      onSetQuantity(rounded);
    } else {
      setDraft(String(quantity ?? 0));
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(String(quantity ?? 0));
  };

  return (
    <div className="flex items-center gap-1 select-none" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onStep?.("out")}
        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 active:scale-90 flex items-center justify-center transition-transform"
        style={{ minHeight: "unset", minWidth: "unset" }}
        aria-label="Diminuer le stock">
        
        <Minus className="w-3 h-3 text-black opacity-85" strokeWidth={2.5} />
      </button>

      {editing ?
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.target.blur();
          if (e.key === "Escape") cancel();
        }}
        className="w-12 h-6 rounded-md border border-emerald-400 bg-white text-center font-semibold text-xs text-black tabular-nums px-1 outline-none"
        style={{ minHeight: "unset", minWidth: "unset" }}
        aria-label="Saisir la quantité" /> :


      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-w-[1.75rem] px-1 h-6 inline-flex items-center justify-center text-center font-semibold text-black tabular-nums rounded-md hover:bg-gray-100 transition-colors text-xs"
        style={{ minHeight: "unset", minWidth: "1.75rem" }}
        title="Saisir la quantité"
        aria-label="Saisir la quantité">
        
          {quantity}
        </button>
      }

      <button
        type="button"
        onClick={() => onStep?.("in")}
        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 active:scale-90 flex items-center justify-center transition-transform"
        style={{ minHeight: "unset", minWidth: "unset" }}
        aria-label="Augmenter le stock">
        
        <Plus className="w-3 h-3 text-black" strokeWidth={2.5} />
      </button>
    </div>);

}
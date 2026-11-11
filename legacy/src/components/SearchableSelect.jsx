import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, X } from "lucide-react";

/**
 * A searchable combobox that combines free text input with suggestions from a list.
 * Props:
 *   items: [{ value, label, sub? }]  — the suggestions
 *   value: string                    — currently selected/typed value (the displayed label)
 *   onSelect(item)                   — called when a suggestion is clicked; item = { value, label }
 *   onChange(text)                   — called on every keystroke (free text)
 *   placeholder: string
 *   className: string
 */
export default function SearchableSelect({ items = [], value = "", onSelect, onChange, placeholder = "Rechercher...", className = "", autoFocus = false }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external value changes (e.g. on edit-mode pre-fill)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Auto-focus différé : sur Android, focaliser immédiatement au montage
  // ouvre le clavier avant que le layout ne soit stable, ce qui masque le
  // champ. On attend que le layout se stabilise, puis on focalise.
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 350);
    return () => clearTimeout(t);
  }, [autoFocus]);

  // Remonte le champ au centre de la zone visible (au-dessus du clavier)
  // après l'animation d'ouverture du clavier (~300ms sur Android/iOS).
  const scrollIntoViewDelayed = () => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => (i.label || "").toLowerCase().includes(q));
  }, [items, query]);
  const visible = useMemo(() => filtered.slice(0, 50), [filtered]);

  const handleInput = (e) => {
    const text = e.target.value;
    setQuery(text);
    setOpen(true);
    onChange && onChange(text);
  };

  const handleSelect = (item) => {
    setQuery(item.label);
    setOpen(false);
    onSelect && onSelect(item);
  };

  const handleClear = () => {
    setQuery("");
    setOpen(false);
    onChange && onChange("");
    onSelect && onSelect({ value: "", label: "" });
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onFocus={() => { setOpen(true); scrollIntoViewDelayed(); }}
          placeholder={placeholder}
          className="pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground p-0.5">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-md border border-border/60 bg-card shadow-lg text-sm">
          {visible.map((item, i) => (
            <li
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              className="flex flex-col px-3 py-2 cursor-pointer hover:bg-green-50 hover:text-green-700"
            >
              <span className="font-medium">{item.label}</span>
              {item.sub && (Array.isArray(item.sub) ? (
                <span className="text-xs text-muted-foreground flex flex-col">
                  {item.sub.map((s, i) => <span key={i}>{s}</span>)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{item.sub}</span>
              ))}
            </li>
          ))}
          {filtered.length > visible.length && (
            <li className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border/40">
              {filtered.length - visible.length} autres résultats…
            </li>
          )}
        </ul>
      )}


    </div>
  );
}
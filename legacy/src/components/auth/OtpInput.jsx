import React, { useRef } from "react";

export default function OtpInput({ length = 6, value, onChange, onComplete }) {
  const refs = useRef([]);

  const digits = Array.from({ length }, (_, i) => value[i] || "");

  // Distribue un code complet (collé ou auto-rempli) sur toutes les cases.
  const setCode = (raw) => {
    const text = (raw || "").replace(/\D/g, "").slice(0, length);
    const arr = Array.from({ length }, (_, i) => text[i] || "");
    onChange(arr.join(""));
    const lastFilled = Math.min(text.length, length) - 1;
    refs.current[Math.max(0, lastFilled)]?.focus();
    if (text.length === length && onComplete) onComplete(text);
  };

  const handleChange = (i, raw) => {
    // Auto-remplissage : le navigateur peut déposer tout le code dans une case.
    if (raw.length > 1) {
      setCode(raw);
      return;
    }
    const char = raw.replace(/\D/g, "").slice(-1);
    const arr = digits.slice();
    arr[i] = char;
    const next = arr.join("").slice(0, length);
    onChange(next);
    if (char && i < length - 1) refs.current[i + 1]?.focus();
    if (next.length === length && onComplete) onComplete(next);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e, i) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (text) setCode(text);
  };

  return (
    <div className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(e, i)}
          autoFocus={i === 0}
          aria-label={`Code chiffre ${i + 1}`}
          className="w-12 h-14 text-center text-2xl font-semibold rounded-lg border border-green-400 bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 md:border-border md:bg-card md:text-foreground md:focus:ring-green-500 md:focus:border-green-500"
        />
      ))}
    </div>
  );
}
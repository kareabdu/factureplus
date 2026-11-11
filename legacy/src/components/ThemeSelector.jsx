import React, { useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
];

function applyTheme(value) {
  const dark = value === "dark" || (value === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeSelector() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const choose = (value) => {
    setTheme(value);
    localStorage.setItem("theme", value);
    applyTheme(value);
  };

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-foreground mb-2">Apparence</p>
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => choose(value)}
            style={{ minHeight: "unset", minWidth: "unset" }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${theme === value ? "bg-card text-green-600 shadow-sm" : "text-muted-foreground"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
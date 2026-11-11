import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FloatingActionBar({ actions, moreActions }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [moreOpen]);

  return (
    <div
    className="md:hidden fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-0.75rem)] max-w-lg"
    style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <AnimatePresence>
        {moreOpen && moreActions?.length > 0 && (
          <div className="relative z-40 mx-auto mb-2 flex flex-col items-end gap-2 pointer-events-none">
            {[...moreActions].reverse().map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.85 }}
                  transition={{ duration: 0.16, delay: i * 0.04 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { a.onClick(); setMoreOpen(false); }}
                  title={a.label}
                  className={`pointer-events-auto flex items-center gap-2 rounded-full pl-3 pr-4 py-2 shadow-lg ${
                    a.danger ? "bg-red-500 text-white" : "bg-card text-foreground border border-border/60"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" strokeWidth={1.5} />}
                  {a.label && !["supprimer", "dupliquer"].includes(a.label.toLowerCase()) && (
                    <span className="text-sm font-medium">{a.label}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </AnimatePresence>
      <div ref={containerRef} className="relative mx-auto flex items-stretch justify-around gap-0.5 rounded-2xl bg-emerald-50/90 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.10)] px-1.5 py-1.5">
        {actions.map((a, i) => {
          const Icon = a.icon;
          const active = moreOpen && a.isMore;
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => { if (a.isMore) setMoreOpen(v => !v); else { setMoreOpen(false); a.onClick(); } }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 px-1 transition-colors ${
                active ? "bg-emerald-50 text-emerald-700" : "active:bg-muted"
              } ${a.danger ? "text-red-600" : "text-[#4A4D58]"}`}
            >
              {Icon && <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 1.6} />}
              <span className="text-[10px] font-medium leading-none whitespace-nowrap">{a.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
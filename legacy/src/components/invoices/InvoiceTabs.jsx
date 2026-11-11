import React, { useRef, useState, useLayoutEffect } from "react";

const TABS = [
  { key: "all", label: "Toutes" },
  { key: "unpaid", label: "Non payée" },
  { key: "paid", label: "Payée" },
  { key: "cancelled", label: "Annulée" },
];

export default function InvoiceTabs({ activeTab, onChange, tabs = TABS }) {
  const containerRef = useRef(null);
  const [highlight, setHighlight] = useState({ x: 0, w: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector('[data-active="true"]');
    if (!activeBtn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = activeBtn.getBoundingClientRect();
    setHighlight({
      x: bRect.left - cRect.left,
      w: bRect.width,
    });
  }, [activeTab, tabs]);

  return (
    <div className="flex justify-center px-4">
      <div
        ref={containerRef}
        className="relative inline-flex items-center gap-0.5 p-1 rounded-full bg-[#EAEAEA]/80 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full"
      >
        <div
          className="absolute top-1 bottom-1 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateX(${highlight.x}px)`,
            width: `${highlight.w}px`,
          }}
        />
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              data-active={active}
              onClick={() => onChange(tab.key)}
              className={`relative z-10 px-4 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors duration-200 ${
                active
                  ? "text-emerald-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
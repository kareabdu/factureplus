import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CustomerRow({ customer, stats, fmt, onLongPress }) {
  const navigate = useNavigate();
  const timer = useRef(null);
  const longPressed = useRef(false);

  const s = stats.get(customer.name) || { count: 0, total: 0, sym: "CFA" };
  const target = `${createPageUrl("CustomerDetail")}?id=${customer.id}`;

  const startPress = (e) => {
    longPressed.current = false;
    const t = e?.touches?.[0];
    const coords = t ? { x: t.clientX, y: t.clientY } : undefined;
    const rect = e.currentTarget.getBoundingClientRect();
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress?.(customer, { coords, rect });
    }, 450);
  };
  const cancelPress = () => { if (timer.current) clearTimeout(timer.current); };

  const handleClick = () => {
    cancelPress();
    if (longPressed.current) { longPressed.current = false; return; }
    navigate(target);
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        onLongPress?.(customer, { coords: { x: e.clientX, y: e.clientY }, rect });
      }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      className="block cursor-pointer select-none"
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
    >
      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-card hover:bg-muted/50 active:bg-muted transition-colors">
        <div className="min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{customer.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{s.count} facture{s.count > 1 ? "s" : ""}</p>
        </div>
        <p className="font-semibold text-foreground text-sm ml-3 text-right whitespace-nowrap">
          {fmt(s.total, s.sym)}
        </p>
      </div>
    </div>
  );
}
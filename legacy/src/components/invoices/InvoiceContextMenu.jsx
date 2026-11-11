import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

/**
 * Menu contextuel style iOS : carte flottante attachée à l'élément long-pressé,
 * arrière-plan flou, apparition en fondu au-dessus de la ligne.
 */
export default function InvoiceContextMenu({ rect, title, header, primaryAction, groups, destructive, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  const rows = [];
  if (primaryAction) rows.push({ ...primaryAction, danger: false });
  (groups || []).forEach((g) => g.forEach((a) => rows.push({ ...a, danger: !!a.danger })));
  if (destructive) rows.push({ ...destructive, danger: true });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !rect) return;
    const w = el.offsetWidth || 280;
    const h = el.offsetHeight || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, vw - w - 8));
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    let top;
    if (spaceAbove >= h + 8 || spaceAbove >= spaceBelow) {
      top = rect.top - h - 8; // au-dessus de la ligne
    } else {
      top = rect.bottom + 8; // en dessous
    }
    top = Math.max(8, Math.min(top, vh - h - 8));
    setPos({ left, top });
  }, [rect]);

  // Ferme sur scroll/resize (le menu reste attaché à un élément qui défile)
  useEffect(() => {
    if (!pos) return;
    const close = () => onClose?.();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] select-none">
      <motion.div
        className="absolute inset-0 bg-black/30 backdrop-blur-[6px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={onClose}
      />
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{
          position: "absolute",
          left: pos ? pos.left : 0,
          top: pos ? pos.top : 0,
          visibility: pos ? "visible" : "hidden",
          transformOrigin: "center center",
        }}
        className="w-[280px] rounded-2xl overflow-hidden shadow-2xl bg-[#F2F2F7]/95 backdrop-blur-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || header) && (
          <div className="px-4 pt-3 pb-2 text-center border-b border-black/10">
            {header ? (
              <>
                <p className="text-[11px] text-[#3C3C43]/70 font-medium truncate">{header.label}</p>
                <p className="text-base font-semibold text-black leading-tight truncate">{header.value}</p>
              </>
            ) : (
              <p className="text-[13px] text-[#3C3C43]/70 font-medium truncate">{title}</p>
            )}
          </div>
        )}
        {rows.map((a, i) => (
          <CtxRow key={i} action={a} onClose={onClose} divider={i > 0 || !!(title || header)} />
        ))}
      </motion.div>
    </div>,
    document.body
  );
}

function CtxRow({ action, onClose, divider }) {
  const Icon = action.icon;
  const danger = action.danger;
  const color = danger ? "#FF3B30" : "#000000";
  return (
    <>
      {divider && <div className="h-px bg-black/10 mx-4" />}
      <button
        onClick={() => { action.onClick?.(); onClose?.(); }}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/5"
        style={{ minHeight: "unset", minWidth: "unset" }}
      >
        {Icon ? <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} /> : <span className="w-5 h-5 flex-shrink-0" />}
        <span className="text-[16px] truncate" style={{ color, fontWeight: danger ? 600 : 400 }}>
          {action.label}
        </span>
      </button>
    </>
  );
}
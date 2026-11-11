import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Rideau draggable ancré en bas.
 * - Poignée de préhension en haut
 * - Deux positions : "peek" (~42vh) et "full" (~90vh)
 * - Glisser vers le haut = étendre, vers le bas = réduire puis fermer
 */
export default function MoreSheet({ open, onClose, title = "Plus", children }) {
  const [snap, setSnap] = useState("peek");
  const [dy, setDy] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startSnap = useRef("peek");

  useEffect(() => {
    if (open) {
      setSnap("peek");
      setDy(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const peekH = Math.round(vh * 0.42);
  const fullH = Math.round(vh * 0.9);
  const baseH = snap === "full" ? fullH : peekH;
  const height = Math.max(Math.min(baseH - dy, fullH), 0);

  const onPointerDown = (e) => {
    dragging.current = true;
    setIsDragging(true);
    startY.current = e.clientY;
    startSnap.current = snap;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setDy(e.clientY - startY.current);
  };
  const onPointerUp = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    const delta = e.clientY - startY.current;
    setDy(0);
    if (delta < -60) {
      setSnap("full");
    } else if (delta > 60) {
      if (startSnap.current === "full") setSnap("peek");
      else onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            className="lg:hidden fixed left-0 right-0 z-[60] glass rounded-t-3xl shadow-float border-t border-black/5 flex flex-col select-none"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{
              height,
              bottom: 0,
              transition: isDragging ? "none" : "height 0.3s ease-out",
            }}
          >
        <div
          className="flex items-center justify-between px-5 pt-3 pb-2 touch-none select-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="flex flex-col items-center flex-1 gap-1.5 pointer-events-none">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/40" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            style={{ minHeight: "unset", minWidth: "unset" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
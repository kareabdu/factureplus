import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import useIsAndroid from "@/hooks/useIsAndroid";
import InvoiceContextMenu from "@/components/invoices/InvoiceContextMenu";

export default function InvoiceActionSheet({
  anchor,
  title,
  header,
  primaryAction,
  groups,
  destructive,
  actions,
  onClose,
}) {
  const hasContent = actions || groups || primaryAction || destructive || header;
  const isMobile = useIsMobile();
  const isAndroid = useIsAndroid();
  if (!hasContent) return null;

  const normalizedGroups = groups || (actions ? [actions] : []);

  // Ancre normalisée : { coords, rect } (long-press) ou { x, y } (ancien format)
  const pointAnchor = anchor?.coords
    ? { x: anchor.coords.x, y: anchor.coords.y }
    : (anchor && anchor.x != null ? anchor : null);
  const rectAnchor = anchor?.rect || null;

  // Android : feuille Material ancrée en bas (poignée + lignes alignées à gauche)
  if (isMobile && isAndroid) {
    return (
      <BottomSheet
        title={title}
        header={header}
        primaryAction={primaryAction}
        groups={normalizedGroups}
        destructive={destructive}
        onClose={onClose}
        frosted={false}
      />
    );
  }

  // iOS : menu contextuel flottant attaché à l'élément
  if (isMobile && rectAnchor) {
    return (
      <InvoiceContextMenu
        rect={rectAnchor}
        title={title}
        header={header}
        primaryAction={primaryAction}
        groups={normalizedGroups}
        destructive={destructive}
        onClose={onClose}
      />
    );
  }

  // Mobile (sans rect, hors Android) : feuille ancrée en bas
  if (isMobile) {
    return (
      <BottomSheet
        title={title}
        header={header}
        primaryAction={primaryAction}
        groups={normalizedGroups}
        destructive={destructive}
        onClose={onClose}
        frosted={false}
      />
    );
  }

  // Desktop: Gmail-style floating menu anchored at cursor (right-click)
  return (
    <DesktopMenu
      anchor={pointAnchor || { x: window.innerWidth / 2, y: window.innerHeight / 2 }}
      title={title}
      header={header}
      primaryAction={primaryAction}
      groups={normalizedGroups}
      destructive={destructive}
      onClose={onClose}
    />
  );
}

/* --------------------------- Mobile bottom sheet --------------------------- */

function BottomSheet({ title, header, primaryAction, groups, destructive, onClose, frosted }) {
  // Sépare les actions normales des actions destructives (affichées en rouge,
  // regroupées en bas juste au-dessus du bouton Annuler).
  const normalRows = [];
  if (primaryAction) normalRows.push(primaryAction);
  groups.forEach((g) => g.forEach((a) => { if (!a.danger) normalRows.push(a); }));

  const dangerRows = [];
  if (destructive) dangerRows.push(destructive);
  groups.forEach((g) => g.forEach((a) => { if (a.danger) dangerRows.push(a); }));

  const sheetBg = frosted ? "bg-white/90 backdrop-blur-xl" : "bg-[#F8F9FA]";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center select-none">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative w-full ${sheetBg} rounded-t-[20px] shadow-2xl overflow-hidden`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée Material */}
        <div className="flex justify-center pt-3 pb-1">
          <span className="block w-10 h-1 rounded-full bg-[#7E7E7E]" />
        </div>

        {title && !header && (
          <div className="px-4 pt-2 pb-2 text-center">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
          </div>
        )}
        {header && (
          <div className="px-4 pt-3 pb-3 text-center">
            <p className="text-[11px] text-muted-foreground font-medium">{header.label}</p>
            <p className="text-lg font-bold text-foreground leading-tight">{header.value}</p>
          </div>
        )}

        <div>
          {normalRows.map((a, i) => (
            <BottomRow key={`n${i}`} action={a} onClose={onClose} />
          ))}
          {dangerRows.length > 0 && <div className="h-px bg-gray-200" />}
          {dangerRows.map((a, i) => (
            <BottomRow key={`d${i}`} action={a} onClose={onClose} />
          ))}
        </div>

        <div className="h-px bg-gray-200" />
        <button
          onClick={onClose}
          className="w-full text-center px-4 py-4 text-base text-gray-900 font-medium active:bg-black/5"
          style={{ minHeight: "unset", minWidth: "unset" }}
        >
          Annuler
        </button>
      </div>
    </div>,
    document.body
  );
}

function BottomRow({ action, onClose }) {
  const Icon = action.icon;
  const danger = action.danger;
  return (
    <button
      onClick={() => { action.onClick?.(); onClose?.(); }}
      className={`w-full flex items-center gap-4 px-6 py-4 text-left text-[15px] active:bg-black/5 ${danger ? "text-[#D32F2F] font-semibold" : "text-[#1C1C1C] font-medium"}`}
      style={{ minHeight: "unset", minWidth: "unset" }}
    >
      {Icon ? <Icon className="w-[22px] h-[22px] flex-shrink-0" style={{ color: danger ? "#D32F2F" : "#3C3C43" }} /> : <span className="w-[22px] h-[22px] flex-shrink-0" />}
      <span className="truncate">{action.label}</span>
    </button>
  );
}

/* --------------------------- Desktop floating menu --------------------------- */

function DesktopMenu({ anchor, title, header, primaryAction, groups, destructive, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: anchor.x, top: anchor.y });
  const pointerDownOnOverlay = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = anchor.x;
    let top = anchor.y;
    if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
    if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
    left = Math.max(8, left);
    top = Math.max(8, top);
    setPos({ left, top });
  }, [anchor.x, anchor.y]);

  const showSepBefore = (gi) => primaryAction || gi > 0;

  return (
    <div
      className="fixed inset-0 z-[70] select-none"
      onPointerDown={() => { pointerDownOnOverlay.current = true; }}
      onClick={() => {
        if (!pointerDownOnOverlay.current) return;
        pointerDownOnOverlay.current = false;
        onClose?.();
      }}
      onContextMenu={(e) => { e.preventDefault(); onClose?.(); }}
    >
      <div
        ref={ref}
        style={{ left: pos.left, top: pos.top }}
        className="absolute w-64 bg-card rounded-lg shadow-xl border border-border/60 py-1.5 text-sm select-none"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {header && (
          <div className="px-4 py-2 border-b border-gray-100 mb-1">
            <p className="text-[11px] text-muted-foreground font-medium">{header.label}</p>
            <p className="text-lg font-semibold text-foreground leading-tight">{header.value}</p>
          </div>
        )}
        {title && !header && (
          <div className="px-4 py-2 border-b border-gray-100 mb-1 text-center">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          </div>
        )}
        {primaryAction && <MenuRow action={primaryAction} onClose={onClose} primary />}
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {showSepBefore(gi) && <div className="h-px bg-border/60 my-1" />}
            {group.map((a, i) => <MenuRow key={i} action={a} onClose={onClose} />)}
          </React.Fragment>
        ))}
        {destructive && (
          <>
            <div className="h-px bg-border/60 my-1" />
            <MenuRow action={destructive} onClose={onClose} />
          </>
        )}
      </div>
    </div>
  );
}

function MenuRow({ action, onClose, primary }) {
  const Icon = action.icon;
  return (
    <button
      onClick={() => { action.onClick?.(); onClose?.(); }}
      className={`w-full flex items-center gap-3 px-4 py-2 text-left text-[14px] min-h-0 transition-colors hover:bg-muted ${action.danger ? "text-red-600" : "text-foreground"} ${primary ? "font-semibold" : "font-normal"}`}
      style={{ minHeight: "unset", minWidth: "unset" }}
    >
      {Icon ? <Icon className={`w-4 h-4 flex-shrink-0 ${action.danger ? "text-red-500" : "text-muted-foreground"}`} /> : <span className="w-4 h-4 flex-shrink-0" />}
      <span className="truncate">{action.label}</span>
    </button>
  );
}
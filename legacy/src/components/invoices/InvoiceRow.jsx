import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function InvoiceRow({ invoice, formatMoney, onLongPress, onOpen, highlighted, index = 0 }) {
  const navigate = useNavigate();
  const isPaid = invoice.status === "paid";
  const paymentDate = invoice.payments?.length
    ? invoice.payments[invoice.payments.length - 1].date
    : invoice.payment_date;
  const date = isPaid && paymentDate ? paymentDate : (invoice.date || invoice.created_date);
  const isOverdue = !!invoice.due_date
    && !isPaid
    && invoice.status !== "cancelled"
    && invoice.status !== "refused"
    && new Date(invoice.due_date) < new Date(new Date().toDateString());
  const docType = invoice.type === "proforma" ? "proforma" : invoice.type === "bl" ? "bl" : invoice.type === "return" ? "return" : "invoice";
  const target = `${createPageUrl("AddInvoice")}?type=${docType}&id=${invoice.id}`;
  const isReturn = invoice.type === "return";

  const timer = useRef(null);
  const longPressed = useRef(false);

  const startPress = (e) => {
    longPressed.current = false;
    const t = e?.touches?.[0];
    const coords = t ? { x: t.clientX, y: t.clientY } : undefined;
    const rect = e.currentTarget.getBoundingClientRect();
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress?.(invoice, { coords, rect });
    }, 450);
  };
  const cancelPress = () => { if (timer.current) clearTimeout(timer.current); };

  const handleClick = () => {
    cancelPress();
    if (longPressed.current) { longPressed.current = false; return; }
    if (onOpen) onOpen(invoice);
    else navigate(target);
  };

  return (
    <div
      data-invoice-id={invoice.id}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        onLongPress?.(invoice, { coords: { x: e.clientX, y: e.clientY }, rect });
      }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      className="block cursor-pointer select-none active:scale-[0.97] transition-transform"
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
    >
      <div className={`flex items-center justify-between px-4 py-3 bg-white ${highlighted ? "ring-2 ring-emerald-300" : ""} transition-colors`}>
        <div className="min-w-0">
          <p className="font-medium text-foreground text-sm truncate">
            {invoice.customer_name || "—"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">
              {invoice.invoice_number || "Sans numéro"}
            </p>
            {docType === "bl" && (() => {
              const map = {
                draft: { label: "En attente", cls: "text-muted-foreground bg-muted border-border/60" },
                sent: { label: "Livré", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                cancelled: { label: "Annulé", cls: "text-red-600 bg-red-50 border-red-200" },
              };
              const s = map[invoice.status];
              return s ? (
                <span className={`inline-flex items-center text-[10px] font-medium border rounded-full px-1.5 py-0.5 ${s.cls}`}>
                  {s.label}
                </span>
              ) : null;
            })()}
            {isReturn && (
              <span className="inline-flex items-center text-[10px] font-medium border rounded-full px-1.5 py-0.5 text-indigo-700 bg-indigo-50 border-indigo-200">
                Retour
              </span>
            )}
            {invoice.status === "cancelled" && !isReturn && docType !== "bl" && (
              <span className="inline-flex items-center text-[10px] font-medium border rounded-full px-1.5 py-0.5 text-red-600 bg-red-50 border-red-200">
                Annulée
              </span>
            )}

          </div>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="font-semibold text-foreground text-sm">
            {formatMoney(invoice.total_amount)}
          </p>
          <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-600 font-medium" : isPaid ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
            {isOverdue && invoice.due_date
              ? `Échéance ${format(new Date(invoice.due_date), "dd/MM/yyyy")}`
              : isPaid
                ? paymentDate ? `Payée le ${format(new Date(paymentDate), "dd/MM/yyyy")}` : "Payée"
                : date ? format(new Date(date), "dd/MM/yyyy") : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, X, FileText } from "lucide-react";

export default function CreateInvoiceFab({ type, hidden }) {
  const [open, setOpen] = useState(false);

  // Mode direct : le bouton ouvre le formulaire du type fourni
  if (type) {
    return createPortal(
      <div
        className={`md:hidden fixed right-4 z-40 transition-opacity ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
      >
        <Link
          to={`${createPageUrl("AddInvoice")}?type=${type}`}
          className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center bg-emerald-600 active:bg-emerald-700 transition-colors"
          aria-label="Créer un document"
        >
          <Plus className="w-6 h-6 text-white" />
        </Link>
      </div>,
      document.body
    );
  }

  // Mode menu : choix facture / devis
  return createPortal(
    <div
      className={`md:hidden fixed right-4 z-40 transition-opacity ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
    >
      {open && (
        <div className="absolute right-0 flex flex-col gap-2 items-end" style={{ bottom: "84px" }}>
          <Link
            to={`${createPageUrl("AddInvoice")}?type=invoice`}
            className="flex items-center gap-2 bg-card shadow-lg rounded-full pl-4 pr-2 py-2 border border-border/60"
          >
            <span className="text-sm font-medium text-foreground">Nouvelle facture</span>
            <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </span>
          </Link>
          <Link
            to={`${createPageUrl("AddInvoice")}?type=proforma`}
            className="flex items-center gap-2 bg-card shadow-lg rounded-full pl-4 pr-2 py-2 border border-border/60"
          >
            <span className="text-sm font-medium text-foreground">Nouveau devis</span>
            <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </span>
          </Link>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${
          open ? "bg-gray-700" : "bg-green-600"
        }`}
        aria-label="Créer un document"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
      </button>
    </div>,
    document.body
  );
}
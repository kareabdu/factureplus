import React from "react";
import { ChevronRight, Plus } from "lucide-react";
import ClientAutocomplete from "@/components/invoice-editor/ClientAutocomplete";

export default function ClientCard({ customerName, customerPhone, billingAddress, onPick, onSelect, onPhoneChange, onAddressChange, readOnly }) {
  const isDefault = !customerName || customerName === "Client de passage";
  const dimCls = readOnly ? "opacity-60 cursor-default" : "";
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden md:overflow-visible">
      <button onClick={readOnly ? undefined : onPick} disabled={readOnly} className="md:hidden w-full flex items-center justify-between px-4 py-3.5 disabled:opacity-70">
        <span className="flex items-center gap-1.5 text-base text-emerald-600 font-medium">
          {isDefault && !readOnly ? <><Plus className="w-4 h-4" /> Client</> : `À ${customerName}`}
        </span>
        {!readOnly && <ChevronRight className="w-5 h-5 text-emerald-400" />}
      </button>
      {!isDefault && (
        <div className="md:hidden px-4 pb-4 space-y-2 border-t border-border/60 pt-3">
          <input value={customerPhone} onChange={(e) => onPhoneChange?.(e.target.value)} readOnly={readOnly} placeholder="Téléphone" className={`w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none ${dimCls}`} />
          <input value={billingAddress} onChange={(e) => onAddressChange?.(e.target.value)} readOnly={readOnly} placeholder="Adresse" className={`w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none ${dimCls}`} />
        </div>
      )}
      <div className="hidden md:flex items-stretch">
        <div className="flex-1 min-w-0">
          <ClientAutocomplete customerName={customerName} onSelect={readOnly ? undefined : onSelect} readOnly={readOnly} />
        </div>
        <div className="w-px bg-gray-100 self-stretch" />
        <input value={customerPhone} onChange={(e) => onPhoneChange?.(e.target.value)} readOnly={readOnly} placeholder="Téléphone" className={`w-40 px-4 py-3 text-sm outline-none ${dimCls}`} />
        <div className="w-px bg-gray-100 self-stretch" />
        <input value={billingAddress} onChange={(e) => onAddressChange?.(e.target.value)} readOnly={readOnly} placeholder="Adresse" className={`w-52 px-4 py-3 text-sm outline-none ${dimCls}`} />
      </div>
    </div>
  );
}
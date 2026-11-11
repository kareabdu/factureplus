import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import useNativeMobilePicker from "@/hooks/useNativeMobilePicker";

const METHODS = ["Espèces", "Virement", "Chèque", "Carte", "Mobile Money", "Autre"];

export default function PaymentMethodSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const useNative = useNativeMobilePicker();

  // Sur mobile (iOS/Android), on utilise le sélecteur natif (menu déroulant natif) pour une meilleure UX.
  if (useNative) {
    return (
      <div className="relative flex h-11 w-full items-center rounded-xl bg-gray-100 hover:bg-gray-200/70 px-3 text-sm touch-none transition-colors">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
        >
          <option value="" disabled>Sélectionner...</option>
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className={value ? "text-foreground font-medium truncate" : "text-muted-foreground"}>
          {value || "Sélectionner..."}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto pointer-events-none" />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-xl bg-gray-100 hover:bg-gray-200/70 px-3 text-sm touch-none transition-colors"
        >
          <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>
            {value || "Sélectionner..."}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      {isMobile ? (
        <PopoverContent
          className="w-auto min-w-[200px] p-0 bg-transparent border-0 shadow-none data-[state=open]:animate-none data-[state=closed]:animate-none"
          align="start"
          collisionPadding={12}
        >
          <div className="popover-slide-up relative bg-[#424242] rounded-2xl shadow-2xl overflow-hidden p-1.5">
            <div className="absolute -top-1.5 left-7 w-3 h-3 bg-[#424242] rotate-45 rounded-[2px]" />
            {METHODS.map((m) => {
              const active = m === value;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { onChange(m); setOpen(false); }}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-white/10 active:bg-white/15 transition-colors text-left"
                >
                  <span className={active ? "text-white" : "text-white/85"}>{m}</span>
                  <Check className={`w-4 h-4 text-white transition-all ${active ? "opacity-100 scale-100" : "opacity-0 scale-50"}`} strokeWidth={2.5} />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      ) : (
        <PopoverContent className="w-auto min-w-[200px] p-1.5" align="start" collisionPadding={12}>
          {METHODS.map((m) => {
            const active = m === value;
            return (
              <button
                key={m}
                type="button"
                onClick={() => { onChange(m); setOpen(false); }}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent active:bg-accent/70 transition-colors text-left"
              >
                <span className={active ? "text-foreground" : "text-muted-foreground"}>{m}</span>
                <Check className={`w-4 h-4 text-emerald-600 transition-all ${active ? "opacity-100 scale-100" : "opacity-0 scale-50"}`} strokeWidth={2.5} />
              </button>
            );
          })}
        </PopoverContent>
      )}
    </Popover>
  );
}
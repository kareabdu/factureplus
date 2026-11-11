import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import useNativeMobilePicker from "@/hooks/useNativeMobilePicker";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const DARK_CLASSNAMES = {
  months: "flex flex-col px-2 pt-3 pb-1",
  month: "space-y-1.5",
  caption: "flex justify-between items-center px-2 pb-1 relative",
  caption_label: "text-white text-sm font-semibold capitalize",
  nav: "flex items-center gap-1",
  nav_button: "h-7 w-7 p-0 text-white/80 hover:bg-white/10 rounded-full inline-flex items-center justify-center transition-colors",
  nav_button_previous: "static order-1",
  nav_button_next: "static order-2",
  table: "w-full border-collapse",
  head_row: "flex",
  head_cell: "text-white/45 rounded-md w-9 font-medium text-[0.62rem] uppercase tracking-wide text-center",
  row: "flex w-full mt-0.5",
  cell: "relative p-0 text-center text-sm",
  day: "h-9 w-9 p-0 m-0 font-normal text-white/90 rounded-full hover:bg-white/10 transition-colors",
  day_selected: "bg-[#4A90E2] text-white font-semibold hover:bg-[#4A90E2]",
  day_today: "ring-1 ring-[#4A90E2] text-white font-semibold",
  day_outside: "text-white/25",
  day_disabled: "text-white/20 opacity-50",
  day_hidden: "invisible",
};

const LIGHT_CLASSNAMES = {
  months: "flex flex-col px-2 pt-3 pb-1",
  month: "space-y-1.5",
  caption: "flex justify-between items-center px-2 pb-1 relative",
  caption_label: "text-foreground text-sm font-semibold capitalize",
  nav: "flex items-center gap-1",
  nav_button: "h-7 w-7 p-0 text-muted-foreground hover:bg-accent rounded-full inline-flex items-center justify-center transition-colors",
  nav_button_previous: "static order-1",
  nav_button_next: "static order-2",
  table: "w-full border-collapse",
  head_row: "flex",
  head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.62rem] uppercase tracking-wide text-center",
  row: "flex w-full mt-0.5",
  cell: "relative p-0 text-center text-sm",
  day: "h-9 w-9 p-0 m-0 font-normal text-foreground rounded-full hover:bg-accent transition-colors",
  day_selected: "bg-emerald-600 text-white font-semibold hover:bg-emerald-600",
  day_today: "ring-1 ring-emerald-600 text-foreground font-semibold",
  day_outside: "text-muted-foreground/50",
  day_disabled: "text-muted-foreground/40 opacity-50",
  day_hidden: "invisible",
};

export default function PaymentDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value ? new Date(value + "T00:00:00") : new Date());
  const isMobile = useIsMobile();
  const useNative = useNativeMobilePicker();
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  const display = value ? format(new Date(value + "T00:00:00"), "d MMM yyyy", { locale: fr }) : "";

  // Sur mobile (iOS/Android), on utilise le sélecteur de date natif pour une meilleure UX.
  if (useNative) {
    return (
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-11 w-full items-center rounded-xl bg-gray-100 hover:bg-gray-200/70 px-3 text-sm font-medium text-foreground touch-none transition-colors [color-scheme:light] appearance-none"
      />
    );
  }

  const calendar = (
    <Calendar
      mode="single"
      selected={selected}
      month={month}
      onMonthChange={setMonth}
      onSelect={(d) => { if (d) onChange(format(d, "yyyy-MM-dd")); }}
      locale={fr}
      classNames={isMobile ? DARK_CLASSNAMES : LIGHT_CLASSNAMES}
      components={{
        IconLeft: () => <ChevronLeft className="w-4 h-4" />,
        IconRight: () => <ChevronRight className="w-4 h-4" />,
      }}
    />
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-xl bg-gray-100 hover:bg-gray-200/70 px-3 text-sm touch-none transition-colors"
        >
          <span className={display ? "text-foreground font-medium" : "text-muted-foreground"}>
            {display || "Date"}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      {isMobile ? (
        <PopoverContent
          className="w-[300px] max-w-[calc(100vw-1.5rem)] p-0 bg-transparent border-0 shadow-none data-[state=open]:animate-none data-[state=closed]:animate-none"
          align="start"
          collisionPadding={12}
        >
          <div className="popover-zoom-fade relative bg-[#333333] rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute -top-1.5 left-7 w-3 h-3 bg-[#333333] rotate-45 rounded-[2px]" />
            {calendar}
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <button
                type="button"
                onClick={() => { onChange(todayStr()); setMonth(new Date()); }}
                className="px-3 py-2 rounded-full text-white/90 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-[#4A90E2] text-white flex items-center justify-center hover:bg-[#3a7bc8] active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
          </div>
        </PopoverContent>
      ) : (
        <PopoverContent className="w-[300px] p-0" align="start" collisionPadding={12}>
          {calendar}
          <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-border/60">
            <button
              type="button"
              onClick={() => { onChange(todayStr()); setMonth(new Date()); }}
              className="px-3 py-2 rounded-full text-muted-foreground text-sm font-medium hover:bg-accent transition-colors"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" strokeWidth={3} />
            </button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
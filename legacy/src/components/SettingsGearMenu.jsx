import React, { useState } from "react";
import { Settings, LogOut, ChevronRight, MessageCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

const WHATSAPP_URL = `https://wa.me/221778339771?text=${encodeURIComponent(
  "Bonjour, j'ai besoin d'aide concernant StockTracker."
)}`;

export default function SettingsGearMenu({ user }) {
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await base44.auth.logout("/");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative h-8 w-8 flex items-end justify-center flex-shrink-0"
          style={{ minHeight: "unset", minWidth: "unset" }}
          aria-label="Paramètres du compte"
        >
          <span className="h-8 w-8 flex items-center justify-center pointer-events-none">
            <span className="w-7 h-7 rounded-lg bg-[#d1fae5] text-[#000] text-[11px] font-semibold flex items-center justify-center">
            {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
          </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-0 shadow-float border border-black/5 rounded-2xl bg-white/95 backdrop-blur-xl overflow-hidden">
        {/* Email */}
        <div className="px-3.5 py-2.5 border-b border-black/5 bg-gradient-to-b from-emerald-50/60 to-transparent">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Connecté en tant que</p>
          <p className="text-xs font-semibold text-foreground truncate">{user?.email || "—"}</p>
        </div>

        {/* Paramètres */}
        <Link
          to={createPageUrl("Settings")}
          onClick={() => setOpen(false)}
          className="flex items-center justify-between px-3 py-2 hover:bg-emerald-50/60 active:bg-emerald-50 transition-colors group"
          style={{ minHeight: "unset", minWidth: "unset" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
              <Settings className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-foreground">Paramètres</span>
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
        </Link>

        {/* Aide WhatsApp */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="flex items-center justify-between px-3 py-2 hover:bg-emerald-50/60 active:bg-emerald-50 transition-colors group"
          style={{ minHeight: "unset", minWidth: "unset" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-[#25D366]/15 group-hover:bg-[#25D366]/25 transition-colors">
              <MessageCircle className="w-3 h-3 text-[#25D366]" />
            </div>
            <span className="text-xs font-medium text-foreground">Aide WhatsApp</span>
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
        </a>

        {/* Se déconnecter */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors border-t border-black/5 group"
          style={{ minHeight: "unset", minWidth: "unset" }}
        >
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-50 group-hover:bg-red-100 transition-colors">
            <LogOut className="w-3 h-3 text-red-500" />
          </div>
          <span className="text-xs font-medium">Se déconnecter</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
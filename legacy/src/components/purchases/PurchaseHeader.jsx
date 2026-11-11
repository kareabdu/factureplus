import React from "react";
import { MoreHorizontal, FolderOpen, Copy, Save } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function PurchaseHeader({ onBack, onLoadTemplate, onCopyLast, onSaveTemplate }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <button
        type="button"
        onClick={onBack}
        className="h-9 px-4 rounded-full border border-emerald-600/40 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500/40 text-sm font-semibold active:scale-95 transition"
        style={{ minHeight: "unset", minWidth: "unset" }}
      >
        Annuler
      </button>

      <h1 className="text-base font-bold text-foreground">Nouvel achat</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Options"
            className="h-9 w-9 rounded-full border border-emerald-600/40 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500/40 flex items-center justify-center active:scale-95 transition"
            style={{ minHeight: "unset", minWidth: "unset" }}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={onLoadTemplate}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Charger un modèle
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopyLast}>
            <Copy className="w-4 h-4 mr-2" />
            Copier le dernier achat
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSaveTemplate}>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer comme modèle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
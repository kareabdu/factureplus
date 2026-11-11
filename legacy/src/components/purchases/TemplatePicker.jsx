import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderOpen } from "lucide-react";

export default function TemplatePicker({ open, onOpenChange, templates = [], onPick }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-center text-base font-bold">Modèles d'achat</DialogTitle>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto p-3 space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onPick(template)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] text-left active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-black/[0.05] dark:bg-white/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {(template.items || []).length} article(s)
                  {template.supplier_name ? ` · ${template.supplier_name}` : ""}
                </p>
              </div>
            </button>
          ))}

          {templates.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Aucun modèle enregistré
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
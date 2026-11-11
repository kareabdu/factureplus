import React from "react";
import { Bike } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function LivreurCard({ livreurId, livreurName, livreurs, onChange, readOnly }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
          <Bike className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Livreur / point de relais</p>
          <Select
            value={livreurId || "__none__"}
            disabled={readOnly}
            onValueChange={(v) => {
              const id = v === "__none__" ? "" : v;
              const l = livreurs.find((x) => x.id === id);
              onChange({ livreur_id: id, livreur_name: l?.name || "" });
            }}
          >
            <SelectTrigger className="w-full border-0 bg-transparent px-0 py-0 h-auto shadow-none focus:ring-0 rounded-none text-sm font-medium text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Aucun livreur</SelectItem>
              {livreurs.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}{l.is_relay !== false ? " (relais)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
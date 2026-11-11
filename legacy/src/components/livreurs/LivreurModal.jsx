import React, { useState, useEffect } from "react";
import { Livreur } from "@/entities/all";
import { X } from "lucide-react";
import { getTeamId } from "@/lib/team";

export default function LivreurModal({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", contact_person: "", is_relay: true, notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing
        ? {
            name: editing.name || "",
            phone: editing.phone || "",
            address: editing.address || "",
            contact_person: editing.contact_person || "",
            is_relay: editing.is_relay !== false,
            notes: editing.notes || "",
          }
        : { name: "", phone: "", address: "", contact_person: "", is_relay: true, notes: "" }
      );
    }
  }, [open, editing]);

  if (!open) return null;

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { alert("Nom du livreur requis"); return; }
    setSaving(true);
    try {
      if (editing) {
        await Livreur.update(editing.id, { ...form, team_id: await getTeamId() });
      } else {
        await Livreur.create({ ...form, team_id: await getTeamId() });
      }
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl border border-border/60 w-full max-w-sm">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">{editing ? "Modifier le livreur" : "Nouveau livreur"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 space-y-2">
          <input value={form.name} onChange={set("name")} placeholder="Nom du livreur" className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none" />
          <input value={form.contact_person} onChange={set("contact_person")} placeholder="Personne de contact" className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none" />
          <input value={form.phone} onChange={set("phone")} placeholder="Téléphone" className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none" />
          <input value={form.address} onChange={set("address")} placeholder="Adresse / zone" className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none" />
          <label className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 cursor-pointer">
            <span className="text-sm text-foreground font-medium">Point de relais (gère un stock)</span>
            <input
              type="checkbox"
              checked={form.is_relay}
              onChange={(e) => setForm((prev) => ({ ...prev, is_relay: e.target.checked }))}
              className="w-4 h-4 accent-emerald-600"
            />
          </label>
          <textarea value={form.notes} onChange={set("notes")} placeholder="Notes" rows={2} className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
          <button onClick={save} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-60 text-sm transition-colors">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
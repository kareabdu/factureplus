import React, { useState, useEffect } from "react";
import { Supplier } from "@/entities/all";
import { X } from "lucide-react";
import { getTeamId } from "@/lib/team";

export default function SupplierModal({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", contact_person: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing
        ? {
            name: editing.name || "",
            phone: editing.phone || "",
            email: editing.email || "",
            address: editing.address || "",
            contact_person: editing.contact_person || "",
            notes: editing.notes || "",
          }
        : { name: "", phone: "", email: "", address: "", contact_person: "", notes: "" }
      );
    }
  }, [open, editing]);

  if (!open) return null;

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { alert("Nom du fournisseur requis"); return; }
    setSaving(true);
    try {
      if (editing) {
        await Supplier.update(editing.id, { ...form, team_id: await getTeamId() });
      } else {
        await Supplier.create({ ...form, team_id: await getTeamId() });
      }
      setForm({ name: "", phone: "", email: "", address: "", contact_person: "", notes: "" });
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
          <h3 className="font-semibold text-foreground text-sm">{editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 space-y-2">
          <input value={form.name} onChange={set("name")} placeholder="Nom du fournisseur" className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none" />
          <input value={form.contact_person} onChange={set("contact_person")} placeholder="Personne de contact" className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none" />
          <input value={form.phone} onChange={set("phone")} placeholder="Téléphone" className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none" />
          <input value={form.email} onChange={set("email")} type="email" placeholder="Email" className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none" />
          <input value={form.address} onChange={set("address")} placeholder="Adresse" className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none" />
          <textarea value={form.notes} onChange={set("notes")} placeholder="Notes" rows={2} className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
          <button onClick={save} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-60 text-sm transition-colors">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
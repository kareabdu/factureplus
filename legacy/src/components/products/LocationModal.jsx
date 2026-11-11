import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Location } from "@/entities/all";
import { getTeamId } from "@/lib/team";

export default function LocationModal({ open, onClose, onSaved, location = null }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: location?.name || "", description: location?.description || "" });
    }
  }, [open, location]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (location) {
        await Location.update(location.id, form);
      } else {
        await Location.create({ ...form, team_id: await getTeamId() });
      }
      onClose();
      onSaved?.();
    } catch (err) {
      alert("Erreur : " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{location ? "Modifier l'emplacement" : "Nouvel emplacement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Nom de l'emplacement *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex : Entrepôt A, Rayon 3"
              required
              autoFocus
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description optionnelle"
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
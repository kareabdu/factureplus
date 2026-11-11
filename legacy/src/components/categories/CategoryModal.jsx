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
import { Category } from "@/entities/all";
import { getTeamId } from "@/lib/team";

export default function CategoryModal({ open, onClose, onSaved, category = null }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: category?.name || "",
        description: category?.description || "",
      });
    }
  }, [open, category]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (category) {
        await Category.update(category.id, form);
      } else {
        await Category.create({ ...form, team_id: await getTeamId() });
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
          <DialogTitle>{category ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Nom de la catégorie *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex : Électronique, Alimentation"
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
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
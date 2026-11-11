import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "loyer", label: "Loyer" },
  { value: "salaire", label: "Salaire" },
  { value: "fournitures", label: "Fournitures" },
  { value: "transport", label: "Transport" },
  { value: "facture", label: "Facture" },
  { value: "impot", label: "Impôt" },
  { value: "autre", label: "Autre" },
];

const PAYMENT_METHODS = [
  { value: "espece", label: "Espèce" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "carte", label: "Carte" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "autre", label: "Autre" },
];

const VALID_CATS = CATEGORIES.map((c) => c.value);
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ open, onClose, onSave, initial, saving }) {
  const [form, setForm] = useState({
    merchant_name: "",
    amount: "",
    date: todayStr(),
    category: "autre",
    description: "",
    payment_method: "",
    receipt_url: "",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        merchant_name: initial.merchant_name || "",
        amount: initial.amount != null ? String(initial.amount) : "",
        date: /^\d{4}-\d{2}-\d{2}$/.test(initial.date) ? initial.date : todayStr(),
        category: VALID_CATS.includes(initial.category) ? initial.category : "autre",
        description: initial.description || "",
        payment_method: initial.payment_method || "",
        receipt_url: initial.receipt_url || "",
      });
    } else {
      setForm({
        merchant_name: "",
        amount: "",
        date: todayStr(),
        category: "autre",
        description: "",
        payment_method: "",
        receipt_url: "",
      });
    }
  }, [initial, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSave({ ...form, amount: Number(form.amount) || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? "Modifier la dépense" : initial?.receipt_url ? "Vérifier le reçu" : "Nouvelle dépense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {form.receipt_url && (
            <img
              src={form.receipt_url}
              alt="Reçu"
              className="w-full max-h-32 object-contain rounded-lg border border-border/60 bg-muted/50"
            />
          )}
          <div>
            <Label>Libellé</Label>
            <Input
              value={form.merchant_name}
              onChange={(e) => set("merchant_name", e.target.value)}
              required
              placeholder="Libellé de la dépense"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Montant</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                required
                placeholder="0"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Méthode de paiement</Label>
            <Select value={form.payment_method} onValueChange={(v) => set("payment_method", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optionnel"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
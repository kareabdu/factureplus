import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

const CATEGORIES = [
  { value: "virement", label: "Virement" },
  { value: "especes", label: "Espèces" },
  { value: "cheque", label: "Chèque" },
  { value: "frais_bancaire", label: "Frais bancaire" },
  { value: "salaire", label: "Salaire" },
  { value: "vente", label: "Vente" },
  { value: "achat", label: "Achat" },
  { value: "impot", label: "Impôt / Taxe" },
  { value: "pret", label: "Prêt" },
  { value: "autre", label: "Autre" },
];

const today = () => new Date().toISOString().split("T")[0];

export default function BankTransactionModal({ open, onClose, onSave, initial, accounts }) {
  const [form, setForm] = useState({
    account_id: "",
    type: "credit",
    amount: "",
    date: today(),
    description: "",
    category: "autre",
    reference: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        account_id: initial?.account_id || (accounts[0]?.id || ""),
        type: initial?.type || "credit",
        amount: initial?.amount != null ? String(initial.amount) : "",
        date: initial?.date ? initial.date.split("T")[0] : today(),
        description: initial?.description || "",
        category: initial?.category || "autre",
        reference: initial?.reference || "",
      });
    }
  }, [open, initial, accounts]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.account_id || !form.amount || !form.date) return;
    onSave({ ...form, amount: Number(form.amount) || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'opération" : "Nouvelle opération"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, type: "credit" }))}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${form.type === "credit" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-400"}`}
            >
              <ArrowDownCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Entrée</span>
            </button>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, type: "debit" }))}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${form.type === "debit" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-400"}`}
            >
              <ArrowUpCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Sortie</span>
            </button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Compte *</Label>
            <Select value={form.account_id} onValueChange={(v) => setForm((p) => ({ ...p, account_id: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Montant *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className="h-9 text-sm" required autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="h-9 text-sm" required />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Catégorie</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Ex: Paiement fournisseur" className="h-9 text-sm" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Référence</Label>
            <Input value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} placeholder="N° chèque, n° transaction" className="h-9 text-sm" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{initial ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
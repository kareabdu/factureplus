import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BankAccountModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ name: "", bank_name: "", account_number: "", iban: "", initial_balance: 0 });

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name || "",
        bank_name: initial?.bank_name || "",
        account_number: initial?.account_number || "",
        iban: initial?.iban || "",
        initial_balance: initial?.initial_balance || 0,
      });
    }
  }, [open, initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, initial_balance: Number(form.initial_balance) || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le compte" : "Nouveau compte bancaire"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nom du compte *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Compte courant" className="h-9 text-sm" autoFocus required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Banque</Label>
            <Input value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} placeholder="Ex: BICIS, Ecobank" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Numéro de compte</Label>
            <Input value={form.account_number} onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">IBAN</Label>
            <Input value={form.iban} onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Solde initial</Label>
            <Input type="number" value={form.initial_balance} onChange={(e) => setForm((p) => ({ ...p, initial_balance: e.target.value }))} className="h-9 text-sm" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{initial ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
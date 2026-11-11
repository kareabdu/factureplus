import React, { useState } from "react";
import { ClientDeposit } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getTeamId } from "@/lib/team";

const paymentMethods = ["Espèces", "Virement", "Chèque", "Mobile Money", "Carte", "Autre"];

export default function DepositModal({ customerId, customerName, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    amount: "",
    date: today,
    payment_method: "Espèces",
    reference: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      await ClientDeposit.create({
        customer_id: customerId,
        customer_name: customerName,
        amount: Number(form.amount),
        used_amount: 0,
        date: form.date,
        payment_method: form.payment_method,
        reference: form.reference,
        notes: form.notes,
        status: "active",
        team_id: await getTeamId(),
      });
      onSaved();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement de l'acompte");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/40 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-card w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-xl border border-border/60 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/60 sticky top-0 bg-card">
          <h3 className="font-semibold text-foreground">Nouvel acompte</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">Client : <span className="font-medium">{customerName}</span></div>

          <div>
            <Label className="mb-1 block">Montant *</Label>
            <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </div>

          <div>
            <Label className="mb-1 block">Date *</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <Label className="mb-1 block">Méthode de paiement</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block">Référence</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="N° reçu, transaction…" />
          </div>

          <div>
            <Label className="mb-1 block">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className="p-4 border-t border-border/60 sticky bottom-0 bg-card flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={saving || !form.amount} onClick={submit}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
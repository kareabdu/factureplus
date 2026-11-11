import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { X } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";
import PaymentMethodSelect from "./PaymentMethodSelect";
import PaymentDatePicker from "./PaymentDatePicker";

export default function PaymentDialog({ open, onClose, onRecord, onUpdate, editingPayment, balanceDue = 0, sym = "CFA", availableDeposit = 0 }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const isEdit = !!editingPayment;

  useEffect(() => {
    if (open) {
      if (editingPayment) {
        setAmount(String(editingPayment.amount ?? ""));
        setMethod(editingPayment.method || "");
        setDate(editingPayment.date ? editingPayment.date.split("T")[0] : new Date().toISOString().split("T")[0]);
        setNotes(editingPayment.notes || "");
      } else {
        setAmount(""); setMethod("");
        setDate(new Date().toISOString().split("T")[0]);
        setNotes("");
      }
    }
  }, [open, editingPayment]);

  const handleOpenChange = (v) => { if (!v) onClose(); };

  // En édition, le montant max autorisé = solde dû + montant actuel du paiement modifié
  const maxAllowed = isEdit ? balanceDue + (editingPayment.amount || 0) : balanceDue;
  const parsed = parseFloat(amount);
  const invalid = !parsed || parsed <= 0 || parsed > maxAllowed;

  const submit = () => {
    if (invalid) return;
    const payload = { amount: parsed, method, date, notes };
    if (isEdit) onUpdate(payload); else onRecord(payload);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[88dvh] p-0 mx-auto max-w-md">
        {/* Header */}
        <div className="px-4 pt-2.5 pb-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Paiement</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground -mr-1 p-1 touch-none">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Enregistrer un acompte ou un paiement intégral.</p>
        </div>

        <div className="px-4 pb-4 space-y-2.5 flex-1 min-h-0 flex flex-col">
          {/* Carte solde dû */}
          <div className="rounded-lg bg-[#F7F7F7] px-3 py-2 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground">Solde dû</span>
            <span className="text-sm font-bold text-foreground">{formatAmount(maxAllowed, sym)}</span>
          </div>

          {/* Montant */}
          <div className="space-y-1 shrink-0">
            <Label className="text-xs">Montant</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-10 rounded-xl"
            />
            {availableDeposit > 0 && (
              <p className="text-[11px] text-emerald-600">Acompte client : {formatAmount(availableDeposit, sym)} — déduit automatiquement.</p>
            )}
            {amount && parsed > maxAllowed && (
              <p className="text-[11px] text-red-600">Le montant ne peut pas dépasser le disponible.</p>
            )}
          </div>

          {/* Date & Méthode */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <PaymentDatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Méthode</Label>
              <PaymentMethodSelect value={method} onChange={setMethod} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1 shrink-0">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note (facultatif)"
              className="rounded-xl min-h-[44px] resize-none text-sm"
            />
          </div>

          <Button onClick={submit} disabled={invalid} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-base mt-auto shrink-0">
            {isEdit ? "Enregistrer les modifications" : "Enregistrer le paiement"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
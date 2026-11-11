import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Package } from "lucide-react";

export default function QuickStockMovementDialog({ open, onOpenChange, product, locations, onSubmit, submitting }) {
  const isMobile = useIsMobile();
  const [movementType, setMovementType] = useState("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const reset = () => {
    setMovementType("in");
    setQuantity("");
    setReason("");
    setReference("");
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleClose = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return;
    onSubmit({
      movement_type: movementType,
      quantity: qty,
      reason,
      reference,
      date,
      location_id: null,
    });
    reset();
  };

  const title = (
    <>
      <Package className="w-5 h-5 text-emerald-600" />
      Entrée de stock
    </>
  );

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-muted-foreground truncate -mt-1">{product?.name}</p>

      <div className="space-y-1.5">
        <Label htmlFor="qsm-qty">Quantité</Label>
        <Input
          id="qsm-qty"
          type="number"
          min="0"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qsm-date">Date</Label>
        <Input
          id="qsm-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qsm-reason">Raison</Label>
        <Input
          id="qsm-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex : Réappro, casse, perte..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qsm-ref">Référence</Label>
        <Input
          id="qsm-ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="N° bon / facture fournisseur"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="button" variant="outline" onClick={() => handleClose(false)} className="flex-1">
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {submitting ? "..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[92vh] p-0">
          <DrawerHeader className="px-5 pt-3 pb-2 shrink-0 border-b border-gray-100 text-left">
            <DrawerTitle className="flex items-center gap-2 text-base font-bold">
              {title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-5 py-4 overflow-y-auto">
            {formBody}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
          </DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
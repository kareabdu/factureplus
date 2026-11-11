import React, { useState, useEffect } from "react";
import { ClientDeposit } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wallet, Trash2 } from "lucide-react";
import { format } from "date-fns";
import DepositModal from "@/components/customers/DepositModal";
import { formatAmount } from "@/lib/formatAmount";

const paymentMethods = ["Espèces", "Virement", "Chèque", "Mobile Money", "Carte", "Autre"];

const statusLabels = { active: "Disponible", used: "Utilisé", cancelled: "Annulé" };
const statusColors = { active: "text-green-600", used: "text-muted-foreground", cancelled: "text-red-500" };

export default function CustomerDeposits({ customerId, customerName, sym = "CFA" }) {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const list = await ClientDeposit.filter({ customer_id: customerId }, "-date");
    setDeposits(list);
    setLoading(false);
  };

  useEffect(() => { if (customerId) load(); }, [customerId]);

  const remaining = (d) => (Number(d.amount) || 0) - (Number(d.used_amount) || 0);
  const totalAvailable = deposits
    .filter(d => d.status === "active")
    .reduce((s, d) => s + remaining(d), 0);
  const totalReceived = deposits
    .filter(d => d.status !== "cancelled")
    .reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const handleDelete = async (d) => {
    if (!confirm("Supprimer cet acompte ?")) return;
    await ClientDeposit.delete(d.id);
    load();
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-600" /> Acomptes
          </h3>
          <Button size="sm" onClick={() => setShowModal(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-1" /> Acompte
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs text-green-700">Disponible</p>
            <p className="text-lg font-bold text-green-700">{formatAmount(totalAvailable, sym)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Total reçu</p>
            <p className="text-lg font-bold text-foreground">{formatAmount(totalReceived, sym)}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-4">Chargement…</p>
        ) : deposits.length === 0 ? (
          <div className="text-center py-6">
            <Wallet className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Aucun acompte enregistré</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {deposits.map(d => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {formatAmount(d.amount, sym)}
                    {d.status === "active" && remaining(d) < d.amount && (
                      <span className="text-xs text-muted-foreground ml-1">(reste {formatAmount(remaining(d), sym)})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.date ? format(new Date(d.date), "dd/MM/yyyy") : "—"}
                    {d.payment_method ? ` · ${d.payment_method}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={`text-xs ${statusColors[d.status] || "text-muted-foreground"}`}>
                    {statusLabels[d.status] || d.status}
                  </span>
                  <button onClick={() => handleDelete(d)} className="text-muted-foreground/40 hover:text-red-500" aria-label="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {showModal && (
        <DepositModal
          customerId={customerId}
          customerName={customerName}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </Card>
  );
}
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Customer, Invoice } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, Pencil, Trash2, FileText, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import CustomerDeposits from "@/components/customers/CustomerDeposits";
import { formatAmount } from "@/lib/formatAmount";

const statusLabels = {
  draft: "Brouillon", sent: "Envoyée", paid: "Payée", overdue: "En retard",
  cancelled: "Annulée", refused: "Refusée",
};

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <span className={`text-sm text-right ml-3 truncate max-w-[60%] ${value ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

export default function CustomerDetail() {
  const navigate = useNavigate();
  const id = new URLSearchParams(window.location.search).get("id");
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setIsLoading(true);
    const list = await Customer.filter({ id });
    const cust = list[0] || null;
    setCustomer(cust);
    if (cust) {
      const invs = await Invoice.filter({ type: "invoice" }, "-created_date");
      setInvoices(invs.filter(i => i.customer_name === cust.name));
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce client ?")) return;
    await Customer.delete(id);
    navigate(createPageUrl("Customers"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }
  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Client introuvable</p>
      </div>
    );
  }

  const sym = invoices[0]?.currency_symbol || "CFA";
  const totalInvoiced = invoices
    .filter(i => i.status !== "cancelled" && i.status !== "refused")
    .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="hidden md:flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Customers"))} className="shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-heading text-3xl font-semibold text-foreground">{customer.name}</h1>
        </div>

        {/* Info card */}
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-foreground md:hidden">{customer.name}</h2>
              <div className="flex gap-2 md:ml-auto">
                <Button variant="outline" size="sm" className="px-2 md:px-3" onClick={() => navigate(`${createPageUrl("AddCustomer")}?edit=${customer.id}`)}>
                  <Pencil className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Modifier</span>
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 px-2 md:px-3" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Supprimer</span>
                </Button>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/60">
              <InfoRow icon={Phone} label="Téléphone" value={customer.phone} />
              <InfoRow icon={Mail} label="Email" value={customer.email} />
              <InfoRow icon={MapPin} label="Adresse" value={customer.address} />
            </div>
          </CardContent>
        </Card>

        {/* Deposits */}
        <CustomerDeposits customerId={customer.id} customerName={customer.name} sym={sym} />

        {/* Invoices */}
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Factures</h3>
              <span className="text-sm text-muted-foreground">{formatAmount(totalInvoiced, sym)}</span>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Aucune facture</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {invoices.map(inv => (
                  <Link key={inv.id} to={`${createPageUrl("AddInvoice")}?type=invoice&id=${inv.id}`} className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{inv.invoice_number || "Sans numéro"}</p>
                      <p className="text-xs text-muted-foreground">{inv.date ? format(new Date(inv.date), "dd/MM/yyyy") : ""}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-semibold text-foreground">{formatAmount(inv.total_amount, inv.currency_symbol || sym)}</p>
                      <p className={`text-xs ${inv.status === "paid" ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {statusLabels[inv.status] || inv.status}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
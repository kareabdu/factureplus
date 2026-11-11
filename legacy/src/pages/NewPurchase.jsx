import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getTeamSettings } from "@/lib/teamSettings";
import { getTeamId } from "@/lib/team";
import { confirmPurchase, itemsTotal } from "@/lib/purchase";
import { formatAmount } from "@/lib/formatAmount";
import { useToast } from "@/components/ui/use-toast";
import { Building2, Plus, ChevronRight, Loader2, Truck } from "lucide-react";
import PurchaseHeader from "@/components/purchases/PurchaseHeader";
import SupplierPicker from "@/components/purchases/SupplierPicker";
import ProductPickerSheet from "@/components/purchases/ProductPickerSheet";
import PurchaseItemRow from "@/components/purchases/PurchaseItemRow";
import PaymentMethodPicker from "@/components/purchases/PaymentMethodPicker";
import TemplatePicker from "@/components/purchases/TemplatePicker";

export default function NewPurchase() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState("CFA");

  const [supplier, setSupplier] = useState(null);
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidInFull, setPaidInFull] = useState(true);
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [productsData, suppliersData, templatesData, settings] = await Promise.all([
        base44.entities.Product.list("-updated_date"),
        base44.entities.Supplier.list(),
        base44.entities.PurchaseTemplate.list(),
        getTeamSettings(),
      ]);
      setProducts(productsData || []);
      setSuppliers(suppliersData || []);
      setTemplates(templatesData || []);
      if (settings?.currency_symbol) setCurrencySymbol(settings.currency_symbol);
      setLoading(false);
    })();
  }, []);

  const total = itemsTotal(items);
  const paid = paidInFull ? total : Number(paidAmount) || 0;

  const mapItems = (rawItems = []) =>
    rawItems
      .map((raw) => {
        const product = products.find((p) => p.id === raw.product_id);
        if (!product) return null;
        return {
          product_id: product.id,
          product,
          product_name: product.name,
          unit: product.unit || "",
          quantity: raw.quantity ?? 1,
          unit_price: raw.unit_price ?? product.cost_price ?? 0,
        };
      })
      .filter(Boolean);

  const addProduct = (product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: (Number(i.quantity) || 0) + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product,
          product_name: product.name,
          unit: product.unit || "",
          quantity: 1,
          unit_price: product.cost_price ?? 0,
        },
      ];
    });
  };

  const updateItem = (productId, patch) =>
    setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, ...patch } : i)));

  const removeItem = (productId) =>
    setItems((prev) => prev.filter((i) => i.product_id !== productId));

  const copyLastPurchase = async () => {
    const res = await base44.entities.Purchase.list({ sort: "-created_date", limit: 1 });
    const last = (res?.items || res || [])[0];
    if (!last) {
      toast({ title: "Aucun achat précédent" });
      return;
    }
    const mapped = mapItems(last.items || []);
    if (!mapped.length) {
      toast({ title: "Produits indisponibles", description: "Les articles de cet achat ont été supprimés." });
      return;
    }
    setItems(mapped);
    setSupplier(suppliers.find((s) => s.id === last.supplier_id) || null);
    toast({ title: "Dernier achat copié" });
  };

  const loadTemplate = (template) => {
    const mapped = mapItems(template.items || []);
    setItems(mapped);
    setSupplier(suppliers.find((s) => s.id === template.supplier_id) || null);
    setTemplatePickerOpen(false);
    if (!mapped.length) {
      toast({ title: "Modèle vide", description: "Aucun de ses articles n'existe plus." });
    }
  };

  const saveTemplate = async () => {
    if (!items.length) {
      toast({ title: "Ajoutez d'abord des articles" });
      return;
    }
    const name = window.prompt("Nom du modèle d'achat");
    if (!name) return;
    const created = await base44.entities.PurchaseTemplate.create({
      name: name.trim(),
      supplier_id: supplier?.id || "",
      supplier_name: supplier?.name || "",
      items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        unit: i.unit || "",
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
      })),
      team_id: await getTeamId(),
    });
    setTemplates((prev) => [...prev, created]);
    toast({ title: "Modèle enregistré" });
  };

  const handleConfirm = async () => {
    const validItems = items.filter((i) => (Number(i.quantity) || 0) > 0);
    if (!validItems.length) {
      toast({ title: "Quantité invalide", description: "Renseignez au moins une quantité." });
      return;
    }
    setSaving(true);
    try {
      await confirmPurchase({
        supplier,
        items: validItems,
        paymentMethod,
        paidAmount: paid,
        notes,
      });
      toast({
        title: "Achat enregistré",
        description: `${validItems.length} article(s) réapprovisionné(s).`,
      });
      navigate("/Products");
    } catch (err) {
      toast({
        title: "Erreur",
        description: err?.message || "Achat impossible",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F2] dark:bg-background p-4 lg:p-8" style={{ paddingBottom: "24px" }}>
      <div className="max-w-2xl mx-auto">
        <PurchaseHeader
          onBack={() => navigate("/Products")}
          onLoadTemplate={() => setTemplatePickerOpen(true)}
          onCopyLast={copyLastPurchase}
          onSaveTemplate={saveTemplate}
        />

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSupplierPickerOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-black/5 dark:border-white/10 p-4 text-left shadow-sm active:scale-[0.99] transition"
            style={{ minHeight: "unset" }}
          >
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="flex-1 text-sm font-medium text-foreground">Fournisseur</span>
            <span className="text-sm text-emerald-600 dark:text-emerald-400 truncate max-w-[45%]">
              {supplier?.name || "Aucun fournisseur"}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>

          <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
              <p className="text-sm font-semibold text-foreground">Articles</p>
              <button
                type="button"
                onClick={() => setProductPickerOpen(true)}
                className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center active:scale-95"
                style={{ minHeight: "unset", minWidth: "unset" }}
                aria-label="Ajouter un article"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center px-6">
                <Truck className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mt-2">Aucun article ajouté</p>
              </div>
            ) : (
              <div className="px-4 divide-y divide-black/5 dark:divide-white/10">
                {items.map((item) => (
                  <PurchaseItemRow
                    key={item.product_id}
                    item={item}
                    currencySymbol={currencySymbol}
                    onQuantity={(qty) => updateItem(item.product_id, { quantity: qty })}
                    onPrice={(price) => updateItem(item.product_id, { unit_price: price })}
                    onRemove={() => removeItem(item.product_id)}
                  />
                ))}
              </div>
            )}
          </div>

          <PaymentMethodPicker
            value={paymentMethod}
            onChange={setPaymentMethod}
            total={total}
            paid={paidAmount}
            paidInFull={paidInFull}
            onPaidChange={setPaidAmount}
            onTogglePaidInFull={() => {
              setPaidInFull((v) => !v);
              setPaidAmount(String(total));
            }}
            currencySymbol={currencySymbol}
          />

          <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 p-4 shadow-sm">
            <label className="text-sm font-semibold text-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Remarque facultative"
              className="mt-2 w-full rounded-xl bg-black/[0.04] dark:bg-white/[0.08] p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
            />
          </div>

          <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 p-4 shadow-sm flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatAmount(total, currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      <div
        className="sticky bottom-0 z-30 -mx-4 lg:-mx-8 border-t border-black/5 dark:border-white/10 bg-card/95 backdrop-blur-xl px-4 py-3 flex items-center gap-3"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
      >
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground leading-none mb-1">Total</p>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {formatAmount(total, currencySymbol)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving || items.length === 0}
          className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-50"
          style={{ minHeight: "unset" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Confirmer l'achat
        </button>
      </div>

      <SupplierPicker
        open={supplierPickerOpen}
        onOpenChange={setSupplierPickerOpen}
        suppliers={suppliers}
        valueId={supplier?.id}
        onSelect={setSupplier}
      />

      <ProductPickerSheet
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        products={products}
        currencySymbol={currencySymbol}
        onPick={addProduct}
      />

      <TemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        templates={templates}
        onPick={loadTemplate}
      />
    </div>
  );
}
import React, { useState, useEffect, useMemo } from "react";
import { InvoiceItem, Invoice, Product, Location, LivreurStock } from "@/entities/all";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatAmount } from "@/lib/formatAmount";
import EditorHeader from "@/components/invoice-editor/EditorHeader";
import SearchableSelect from "@/components/SearchableSelect";
import ItemLocationSelect from "@/components/invoice-editor/ItemLocationSelect";
import { getTeamId } from "@/lib/team";
import { getTeamSettings } from "@/lib/teamSettings";
import { logActivity } from "@/lib/activity";
import { computeTax } from "@/lib/tax";
import { getProducts, upsertProductInCache } from "@/lib/productCache";

const UNITS = ["Pcs", "heures", "jours", "kg", "litres", "mètres", "yards", "boîtes", "cartons", "sachets", "paquets"];

const UNIT_TO_PRODUCT = {
  "Pcs": "pieces",
  "kg": "kg",
  "litres": "liters",
  "mètres": "meters",
  "yards": "meters",
  "boîtes": "boxes",
  "cartons": "boxes",
  "sachets": "pieces",
  "paquets": "pieces",
  "heures": "pieces",
  "jours": "pieces",
};

function Row({ label, children }) {
  return (
    <div className="p-4 flex items-center justify-between">
      <span className="text-foreground">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

export default function AddInvoiceItem() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docType = searchParams.get("type") || "invoice";
  const invoiceId = searchParams.get("invoice_id");
  const itemId = searchParams.get("item_id");
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sym, setSym] = useState("CFA");
  const [taxSettings, setTaxSettings] = useState(null);
  const [item, setItem] = useState({ product_id: "", product_name: "", unit_price: "", quantity: "", unit: "Pcs", taxable: true, allocations: [] });
  const [loading, setLoading] = useState(!!itemId);
  const [saving, setSaving] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [livreurStockRows, setLivreurStockRows] = useState([]);

  useEffect(() => {
    getProducts().then(setProducts);
    Location.list().then(setLocations);
    getTeamSettings().then((s) => {
      if (!s) return;
      setSym(s.currency_symbol || "CFA");
      setTaxSettings(s);
      const taxEnabled = s.tax_type && s.tax_type !== "none" && (Number(s.tax_rate) || 0) > 0;
      if (taxEnabled) {
        setItem((prev) => ({ ...prev, taxable: true }));
      }
      if (!itemId && s.default_unit) {
        setItem((prev) => ({ ...prev, unit: s.default_unit }));
      }
    });
    if (itemId) {
      InvoiceItem.filter({ id: itemId }).then((list) => {
        if (list[0]) {
          setItem({
            product_id: list[0].product_id || "",
            product_name: list[0].product_name || "",
            unit_price: list[0].unit_price ?? "",
            quantity: list[0].quantity ?? "",
            unit: list[0].unit || "Pcs",
            taxable: list[0].taxable !== false,
            allocations: Array.isArray(list[0].allocations) && list[0].allocations.length
              ? list[0].allocations
              : (list[0].location_id ? [{ location_id: list[0].location_id, quantity: list[0].quantity ?? 0 }] : []),
          });
        }
        setLoading(false);
      });
    }
    if (docType === "bl" && invoiceId) {
      Invoice.filter({ id: invoiceId }).then((list) => {
        const inv = list[0];
        setInvoiceData(inv);
        if (inv?.livreur_id) {
          LivreurStock.filter({ livreur_id: inv.livreur_id }).then(setLivreurStockRows);
        }
      });
    }
  }, []);

  const totalPrice = (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0);
  const taxInfo = taxSettings && taxSettings.tax_type && taxSettings.tax_type !== "none" && (Number(taxSettings.tax_rate) || 0) > 0
    ? computeTax(taxSettings, totalPrice, totalPrice)
    : null;

  const selectedProduct = products.find((pr) => pr.id === item.product_id);
  const productLocations = (selectedProduct?.locations || []).filter((e) => e && e.location_id);
  const hasMultipleLocations = productLocations.length > 1;

  // Pour un BL avec livreur, le stock source est celui du livreur (LivreurStock),
  // pas les emplacements produit. On charge la disponibilité du produit choisi.
  const livreurId = invoiceData?.livreur_id;
  const livreurName = invoiceData?.livreur_name;
  const isBLWithLivreur = docType === "bl" && !!livreurId;
  const livreurStockForProduct = isBLWithLivreur && item.product_id
    ? livreurStockRows.find((r) => r.product_id === item.product_id)
    : null;
  const livreurAvailable = livreurStockForProduct?.quantity ?? 0;
  const enteredQty = parseFloat(item.quantity) || 0;

  // Lorsque l'article est réparti sur plusieurs emplacements, la quantité globale
  // est auto-générée à partir des quantités saisies par emplacement.
  useEffect(() => {
    if (!hasMultipleLocations || isBLWithLivreur) return;
    const allocs = (item.allocations || []).filter((a) => a && a.location_id);
    const sum = allocs.reduce((s, a) => s + (parseFloat(a.quantity) || 0), 0);
    if (parseFloat(item.quantity || 0) !== sum) {
      setItem((prev) => ({ ...prev, quantity: sum }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.allocations, hasMultipleLocations, isBLWithLivreur]);

  // Liste des articles pour le sélecteur — mémoïsée pour éviter de la
  // reconstruire à chaque rendu (coût O(produits × emplacements)).
  const productItems = useMemo(() => products
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" }))
    .map((p) => {
    const locName = (id) => locations.find((l) => l.id === id)?.name || "—";
    const locLines = (p.locations || []).filter((e) => e && e.location_id).map((e) => `${locName(e.location_id)}: ${e.quantity ?? 0}`);
    return {
      value: p.id,
      label: p.name,
      sub: [
        [p.unit_price ? `${p.unit_price.toLocaleString("fr-FR")} ${sym}` : "", `Stock total: ${p.quantity ?? 0}`].filter(Boolean).join(" · "),
        ...locLines,
      ],
    };
  }), [products, locations, sym]);

  const save = async () => {
    if (!invoiceId) { alert("Document introuvable"); return; }
    if (!item.product_name.trim()) { alert("Description obligatoire"); return; }
    const allocs = (item.allocations || []).filter((a) => a && a.location_id && (parseFloat(a.quantity) || 0) > 0);
    if (isBLWithLivreur && item.product_id) {
      if (enteredQty > livreurAvailable) {
        alert(`Stock livreur insuffisant — ${livreurName || "Livreur"} : ${livreurAvailable} disponible(s)`);
        return;
      }
    } else if (hasMultipleLocations) {
      for (const a of allocs) {
        const locStock = productLocations.find((e) => e.location_id === a.location_id)?.quantity ?? 0;
        if ((parseFloat(a.quantity) || 0) > locStock) {
          const locName = locations.find((l) => l.id === a.location_id)?.name || "Emplacement";
          alert(`Quantité supérieure au stock de ${locName} (stock: ${locStock})`);
          return;
        }
      }
      const sum = allocs.reduce((s, a) => s + (parseFloat(a.quantity) || 0), 0);
      const totalStock = productLocations.reduce((s, e) => s + (e.quantity ?? 0), 0);
      if (sum > totalStock) {
        alert(`La somme des quantités (${sum}) dépasse le stock actuel (${totalStock})`);
        return;
      }
    }
    setSaving(true);
    try {
      let productId = item.product_id;
      if (!productId && !itemId) {
        const created = await Product.create({
          name: item.product_name.trim(),
          unit_price: parseFloat(item.unit_price) || 0,
          unit: item.unit || "Pcs",
          team_id: await getTeamId(),
        });
        upsertProductInCache(created);
        productId = created.id;
      }
      const payload = {
        invoice_id: invoiceId,
        team_id: await getTeamId(),
        product_id: productId || "",
        product_name: item.product_name,
        unit_price: parseFloat(item.unit_price) || 0,
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || "Pcs",
        total_price: totalPrice,
        taxable: taxInfo ? true : item.taxable !== false,
        allocations: allocs,
        location_id: allocs[0]?.location_id || "",
      };
      if (itemId) await InvoiceItem.update(itemId, payload);
      else await InvoiceItem.create(payload);
      // Recalcul des totaux de la facture en arrière-plan : non bloquant pour
      // le retour à l'éditeur. AddInvoice rechargera les articles au remontage
      // et son auto-save debounce persistera aussi les totaux (filet de sécurité).
      Promise.resolve().then(async () => {
        try {
          const [allItems, invList] = await Promise.all([
            InvoiceItem.filter({ invoice_id: invoiceId }),
            Invoice.filter({ id: invoiceId }),
          ]);
          const sub = allItems.reduce((s, it) => s + (it.total_price || (it.unit_price || 0) * (it.quantity || 0)), 0);
          const taxSub = allItems.filter((it) => it.taxable !== false).reduce((s, it) => s + (it.total_price || (it.unit_price || 0) * (it.quantity || 0)), 0);
          const ti = taxSettings && taxSettings.tax_type && taxSettings.tax_type !== "none" && (Number(taxSettings.tax_rate) || 0) > 0
            ? computeTax(taxSettings, sub, taxSub)
            : null;
          const tot = ti ? ti.total : sub;
          const pay = parseFloat(invList?.[0]?.deposit_amount) || 0;
          await Invoice.update(invoiceId, {
            status: "draft",
            total_amount: tot,
            balance_due: Math.max(0, tot - pay),
          });
        } catch { /* ne pas bloquer la sauvegarde de l'article */ }
      });
      const refProduct = products.find((pr) => pr.id === productId);
      const enteredPrice = parseFloat(item.unit_price) || 0;
      if (refProduct && refProduct.unit_price != null && Number(refProduct.unit_price) !== enteredPrice) {
        logActivity({ action_type: "update", entity_type: docType, entity_id: invoiceId, description: `Prix unitaire modifié — ${item.product_name} : ${Number(refProduct.unit_price)} → ${enteredPrice}`, metadata: { product: item.product_name, old_price: Number(refProduct.unit_price), new_price: enteredPrice } });
      }
      navigate(-1);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EditorHeader title="Article" onBack={() => navigate(-1)} />
      <div className="max-w-2xl mx-auto p-4 pb-32 space-y-3">
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 divide-y divide-border/60">
          <div className="p-4">
            <SearchableSelect
              value={item.product_name}
              placeholder="Article, produit, service…"
              items={productItems}
              autoFocus={!itemId}
              onChange={(text) => setItem((prev) => ({ ...prev, product_name: text, product_id: "", allocations: [] }))}
              onSelect={(sel) => {
                const p = products.find((pr) => pr.id === sel.value);
                if (p) setItem((prev) => ({ ...prev, product_id: p.id, product_name: p.name, unit_price: p.unit_price ?? "", allocations: [] }));
              }}
            />
          </div>
          {docType !== "bl" && (
          <label className="p-4 flex items-center justify-between cursor-text">
            <span className="text-foreground font-medium">Prix unitaire</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="any"
                value={item.unit_price}
                onChange={(e) => setItem((prev) => ({ ...prev, unit_price: e.target.value }))}
                className="text-right text-foreground w-28 outline-none text-lg font-semibold bg-transparent"
              />
              <span className="text-muted-foreground text-sm">{sym}</span>
            </div>
          </label>
          )}
          <label className="p-4 flex items-center justify-between">
            <span className="text-foreground font-medium">Quantité</span>
            <input
              type="number"
              min="1"
              step="1"
              readOnly={hasMultipleLocations && !isBLWithLivreur}
              value={item.quantity}
              onChange={(e) => setItem((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder={hasMultipleLocations && !isBLWithLivreur ? "Auto" : "0"}
              className={`text-right w-20 outline-none text-lg font-semibold bg-transparent ${hasMultipleLocations && !isBLWithLivreur ? "text-muted-foreground cursor-default" : "text-foreground"}`}
            />
          </label>
          <Row label="Unité">
            <input
              value={item.unit}
              onChange={(e) => setItem((prev) => ({ ...prev, unit: e.target.value.replace(/[0-9]/g, "") }))}
              placeholder="Pcs"
              className="text-right text-foreground outline-none bg-transparent w-24 placeholder:text-muted-foreground"
            />
          </Row>
        </div>

        {isBLWithLivreur && selectedProduct && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Stock livreur</p>
            <p className="text-xs text-muted-foreground truncate">{livreurName || "Livreur"}</p>
          </div>
          <span className={`text-sm font-bold whitespace-nowrap ${enteredQty > livreurAvailable ? "text-red-600" : "text-emerald-600"}`}>
            {livreurAvailable} dispo.
          </span>
        </div>
        )}

        {!isBLWithLivreur && productLocations.length > 0 && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4 space-y-2">
          <ItemLocationSelect
            value={item.allocations}
            onChange={(allocs) => setItem((prev) => ({ ...prev, allocations: allocs }))}
            itemQuantity={item.quantity}
            productLocations={productLocations}
            locations={locations}
          />
        </div>
        )}

        {docType !== "bl" && taxInfo && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4 flex items-center justify-between">
          <span className="text-foreground font-medium">{taxInfo.name} ({taxInfo.rate}%)</span>
          <span className="text-foreground font-semibold">{formatAmount(taxInfo.taxAmount, sym)}</span>
        </div>
        )}

        {docType !== "bl" && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4 flex items-center justify-between">
          <span className="font-semibold text-foreground">Total</span>
          <span className="font-bold text-foreground text-lg">{formatAmount(totalPrice, sym)}</span>
        </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-green-600 text-white font-semibold py-3.5 rounded-2xl shadow-sm disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : itemId ? "Mettre à jour" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
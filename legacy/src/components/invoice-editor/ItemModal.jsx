import React, { useState, useEffect, useMemo } from "react";
import { InvoiceItem, Product, Location } from "@/entities/all";
import { getTeamSettings } from "@/lib/teamSettings";
import { X } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";
import SearchableSelect from "@/components/SearchableSelect";
import ItemLocationSelect from "@/components/invoice-editor/ItemLocationSelect";
import { getTeamId } from "@/lib/team";
import { logActivity } from "@/lib/activity";

const UNITS = ["Pcs", "heures", "jours", "kg", "litres", "mètres", "boîtes", "cartons", "sachets"];
const UNIT_TO_PRODUCT = { "Pcs": "pieces", "kg": "kg", "litres": "liters", "mètres": "meters", "boîtes": "boxes", "cartons": "boxes", "sachets": "pieces", "heures": "pieces", "jours": "pieces" };

export default function ItemModal({ open, invoiceId, itemId, docType, onClose, onSaved, products: parentProducts, locations: parentLocations }) {
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sym, setSym] = useState("CFA");
  const [item, setItem] = useState({ product_id: "", product_name: "", unit_price: "", quantity: "", unit: "Pcs", taxable: false, allocations: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Réutiliser les produits/emplacements déjà chargés par l'éditeur parent
    // au lieu de recharger à chaque ouverture du modal (gain ~400ms).
    if (parentProducts && parentProducts.length) setProducts(parentProducts);
    else Product.list().then(setProducts);
    if (parentLocations && parentLocations.length) setLocations(parentLocations);
    else Location.list().then(setLocations);
    getTeamSettings().then((s) => {
      if (!s) return;
      setSym(s.currency_symbol || "CFA");
      if (!itemId && s.default_unit) {
        setItem((prev) => ({ ...prev, unit: s.default_unit }));
      }
    });
    if (itemId) {
      setLoading(true);
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
    } else {
      setItem({ product_id: "", product_name: "", unit_price: "", quantity: "", unit: "Pcs", taxable: false, allocations: [] });
    }
  }, [open, itemId]);

  // Calcule la liste des suggestions une seule fois (et non à chaque
  // frappe) : la carte des emplacements est construite hors de la boucle.
  const selectItems = useMemo(() => {
    const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
    return products.map((p) => {
      const stockPart = Array.isArray(p.locations) && p.locations.length > 0
        ? p.locations.map((loc) => `${locMap[loc.location_id] || "Emplacement"}: ${loc.quantity ?? 0}`).join(" · ")
        : `Stock: ${p.quantity ?? 0}`;
      return {
        value: p.id,
        label: p.name,
        sub: [p.unit_price ? formatAmount(p.unit_price, sym) : "", stockPart].filter(Boolean).join(" · "),
      };
    });
  }, [products, locations, sym]);

  if (!open) return null;

  const selProduct = products.find((pr) => pr.id === item.product_id);
  const productLocations = Array.isArray(selProduct?.locations) ? selProduct.locations.filter((l) => l && l.location_id) : [];
  const isMultiLocation = productLocations.length > 1;
  const allocationsSum = (item.allocations || []).reduce((s, a) => s + (parseFloat(a.quantity) || 0), 0);

  const totalPrice = (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0);

  const save = async () => {
    if (!item.product_name.trim()) { alert("Description obligatoire"); return; }
    const allocs = (item.allocations || []).filter((a) => a && a.location_id && (parseFloat(a.quantity) || 0) > 0);
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
        taxable: item.taxable !== false,
        allocations: allocs,
        location_id: allocs[0]?.location_id || "",
      };
      if (itemId) await InvoiceItem.update(itemId, payload);
      else await InvoiceItem.create(payload);
      const refProduct = products.find((pr) => pr.id === productId);
      const enteredPrice = parseFloat(item.unit_price) || 0;
      if (refProduct && refProduct.unit_price != null && Number(refProduct.unit_price) !== enteredPrice) {
        logActivity({ action_type: "update", entity_type: docType || "invoice", entity_id: invoiceId, description: `Prix unitaire modifié — ${item.product_name} : ${Number(refProduct.unit_price)} → ${enteredPrice}`, metadata: { product: item.product_name, old_price: Number(refProduct.unit_price), new_price: enteredPrice } });
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl border border-border/60 w-full max-w-sm">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">{itemId ? "Modifier l'article" : "Ajouter un article"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
        </div>
        {loading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Chargement…</div>
        ) : (
          <div className="p-3 space-y-2">
            <div className="border border-border/60 rounded-lg px-2 py-1">
              <SearchableSelect
                value={item.product_name}
                placeholder="Nom article"
                items={selectItems}
                onChange={(text) => setItem((prev) => ({ ...prev, product_name: text, product_id: "", allocations: [] }))}
                onSelect={(sel) => {
                  const p = products.find((pr) => pr.id === sel.value);
                  if (p) {
                    const pLocs = Array.isArray(p.locations) ? p.locations.filter((l) => l && l.location_id) : [];
                    const multi = pLocs.length > 1;
                    setItem((prev) => ({ ...prev, product_id: p.id, product_name: p.name, unit_price: p.unit_price ?? "", unit: p.unit || "Pcs", allocations: [], quantity: multi ? 0 : prev.quantity }));
                  }
                }}
              />
            </div>
            <div className={`grid ${docType === "bl" ? "grid-cols-2" : "grid-cols-3"} gap-2`}>
              {docType !== "bl" && <input type="number" step="any" value={item.unit_price} onChange={(e) => setItem((prev) => ({ ...prev, unit_price: e.target.value }))} placeholder="Prix" className="bg-muted/50 rounded-lg px-2.5 py-2 text-sm outline-none w-full" />}
              <input type="number" min="1" step="1" value={isMultiLocation ? allocationsSum : item.quantity} readOnly={isMultiLocation} onChange={(e) => setItem((prev) => ({ ...prev, quantity: e.target.value }))} placeholder="Qté" className={`rounded-lg px-2.5 py-2 text-sm outline-none w-full ${isMultiLocation ? "bg-muted text-muted-foreground" : "bg-muted/50"}`} />
              <input value={item.unit} onChange={(e) => setItem((prev) => ({ ...prev, unit: e.target.value }))} placeholder="Pcs" className="bg-muted/50 rounded-lg px-2.5 py-2 text-sm outline-none w-full" />
            </div>
            <ItemLocationSelect
              value={item.allocations}
              onChange={(allocs) => {
                const sum = (allocs || []).reduce((s, a) => s + (parseFloat(a.quantity) || 0), 0);
                setItem((prev) => ({ ...prev, allocations: allocs, quantity: isMultiLocation ? sum : prev.quantity }));
              }}
              itemQuantity={item.quantity}
              productLocations={products.find((pr) => pr.id === item.product_id)?.locations}
              locations={locations}
            />
            {docType !== "bl" && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-semibold text-sm text-foreground">{formatAmount(totalPrice, sym)}</span>
            </div>
            )}
            {docType !== "bl" && (
              <label className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-2 cursor-pointer">
                <span className="text-xs text-foreground font-medium">Sujet à taxe</span>
                <input
                  type="checkbox"
                  checked={item.taxable !== false}
                  onChange={(e) => setItem((prev) => ({ ...prev, taxable: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-600"
                />
              </label>
            )}
            <button onClick={save} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-60 text-sm transition-colors">
              {saving ? "Enregistrement…" : itemId ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
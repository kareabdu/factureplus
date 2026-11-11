import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getTeamSettings } from "@/lib/teamSettings";
import { getLocationStock } from "@/lib/locations";
import { createStockMovement } from "@/lib/stockMovement";
import { formatAmount } from "@/lib/formatAmount";
import { useToast } from "@/components/ui/use-toast";
import { ArrowDownToLine, Loader2, Package as PackageIcon, Pencil } from "lucide-react";
import ProductHero from "@/components/products/detail/ProductHero";
import InfoSection from "@/components/products/detail/InfoSection";
import InfoRow from "@/components/products/detail/InfoRow";
import ProductModal from "@/components/products/ProductModal";
import QuickStockMovementDialog from "@/components/products/QuickStockMovementDialog";

const MOVEMENT_LABEL = {
  in: { label: "Entrée", cls: "text-emerald-600 dark:text-emerald-400" },
  out: { label: "Sortie", cls: "text-red-600 dark:text-red-400" },
  adjustment: { label: "Ajustement", cls: "text-muted-foreground" },
};

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function ProductDetail() {
  const productId = new URLSearchParams(window.location.search).get("id");
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [movements, setMovements] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      return;
    }
    const [p, cats, locs, settings] = await Promise.all([
      base44.entities.Product.get(productId).catch(() => null),
      base44.entities.Category.list().catch(() => []),
      base44.entities.Location.list().catch(() => []),
      getTeamSettings().catch(() => null),
    ]);
    setProduct(p);
    setCategories(Array.isArray(cats) ? cats : []);
    setLocations(Array.isArray(locs) ? locs : []);
    if (settings) setCurrencySymbol(settings.currency_symbol || "");
    if (p) {
      const mv = await base44.entities.StockMovement.filter(
        { product_id: productId },
        { sort: "-created_date", limit: 5 }
      ).catch(() => ({ items: [] }));
      setMovements(mv?.items || []);
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  // Statut 404 pour les robots une fois le chargement terminé
  useEffect(() => {
    if (loading || product) return;
    const meta = document.createElement("meta");
    meta.name = "prerender-status-code";
    meta.content = "404";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [loading, product]);

  const handleStep = async (type) => {
    if (!product) return;
    const prevQty = product.quantity ?? 0;
    const newQty = Math.max(0, prevQty + (type === "in" ? 1 : -1));
    if (newQty === prevQty) return;
    setProduct((prev) => ({ ...prev, quantity: newQty }));
    try {
      const locs = Array.isArray(product.locations) ? product.locations : [];
      const location_id = locs.length === 1 ? locs[0].location_id : null;
      const { updatedLocations } = await createStockMovement(product, {
        movement_type: "adjustment",
        quantity: newQty,
        location_id,
      });
      setProduct((prev) => ({ ...prev, locations: updatedLocations }));
      load();
    } catch (err) {
      setProduct((prev) => ({ ...prev, quantity: prevQty }));
      toast({ title: "Erreur", description: err?.message || "Mise à jour impossible", variant: "destructive" });
    }
  };

  const handleMoveSubmit = async (data) => {
    if (!product) return;
    setSubmitting(true);
    try {
      await createStockMovement(product, data);
      setMoveOpen(false);
      await load();
      toast({ title: "Stock mis à jour" });
    } catch (err) {
      toast({ title: "Erreur", description: err?.message || "Mouvement impossible", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3F2] dark:bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F5F3F2] dark:bg-background px-6 text-center">
        <PackageIcon className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cet article n'existe plus.</p>
      </div>
    );
  }

  const categoryName = categories.find((c) => c.id === product.category_id)?.name || "";
  const locationStock = getLocationStock(product, locations);
  const suppliers = (Array.isArray(product.suppliers) && product.suppliers.length
    ? product.suppliers
    : product.supplier
    ? [{ name: product.supplier, reference: product.supplier_reference }]
    : []
  ).filter((s) => s && s.name);
  const margin =
    product.unit_price != null && product.cost_price != null
      ? Number(product.unit_price) - Number(product.cost_price)
      : null;

  return (
    <div className="min-h-screen bg-[#F5F3F2] dark:bg-background p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <ProductHero product={product} categoryName={categoryName} onEdit={() => setShowModal(true)} />

        <InfoSection title="Prix">
          <InfoRow
            label="Prix de vente"
            value={product.unit_price != null ? formatAmount(product.unit_price, currencySymbol) : "—"}
            strong
          />
          <InfoRow
            label="Prix de revient"
            value={product.cost_price != null ? formatAmount(product.cost_price, currencySymbol) : "—"}
          />
          <InfoRow
            label="Marge"
            last
            value={margin != null ? formatAmount(margin, currencySymbol) : "—"}
            className={margin != null && margin < 0 ? "[&_span:last-child]:text-red-600" : ""}
          />
        </InfoSection>

        <InfoSection title="Stock">
          <InfoRow label="Quantité" strong value={`${Number(product.quantity) || 0} ${product.unit || ""}`} />
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/5 dark:border-white/10">
            <button
              type="button"
              onClick={() => handleStep("out")}
              className="w-9 h-9 rounded-lg bg-black/[0.05] dark:bg-white/10 flex items-center justify-center text-lg font-semibold text-foreground active:scale-95 transition-transform"
              style={{ minHeight: "unset", minWidth: "unset" }}
              aria-label="Retirer une unité"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => handleStep("in")}
              className="w-9 h-9 rounded-lg bg-black/[0.05] dark:bg-white/10 flex items-center justify-center text-lg font-semibold text-foreground active:scale-95 transition-transform"
              style={{ minHeight: "unset", minWidth: "unset" }}
              aria-label="Ajouter une unité"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setMoveOpen(true)}
              className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold active:scale-95 transition-transform"
              style={{ minHeight: "unset", minWidth: "unset" }}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Réappro
            </button>
          </div>
          {locationStock.map((loc) => (
            <InfoRow key={loc.id} label={loc.name} value={`${loc.quantity} ${product.unit || ""}`} />
          ))}
          <InfoRow label="Seuil d'alerte" last={!product.unit} value={product.reorder_level ?? "—"} />
          {product.unit && <InfoRow label="Unité" last value={product.unit} />}
        </InfoSection>

        {suppliers.length > 0 && (
          <InfoSection title="Fournisseurs">
            {suppliers.map((s, i) => (
              <InfoRow
                key={`${s.name}-${i}`}
                label={s.name}
                value={s.reference || ""}
                last={i === suppliers.length - 1}
              />
            ))}
          </InfoSection>
        )}

        {product.description && (
          <InfoSection title="Description">
            <div className="px-4 py-3">
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </div>
          </InfoSection>
        )}

        {movements.length > 0 && (
          <InfoSection title="Derniers mouvements">
            {movements.map((m, i) => {
              const meta = MOVEMENT_LABEL[m.movement_type] || MOVEMENT_LABEL.adjustment;
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    i === movements.length - 1 ? "" : "border-b border-black/5 dark:border-white/10"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${meta.cls}`}>{meta.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[formatDate(m.created_date), m.reason].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    {m.movement_type === "in" ? "+" : m.movement_type === "out" ? "−" : ""}
                    {m.quantity}
                  </span>
                </div>
              );
            })}
          </InfoSection>
        )}

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform"
          style={{ minHeight: "unset" }}
        >
          <Pencil className="w-4 h-4" />
          Modifier l'article
        </button>
      </div>

      <ProductModal
        open={showModal}
        editProduct={product}
        onClose={() => setShowModal(false)}
        onSaved={load}
      />

      <QuickStockMovementDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        product={product}
        locations={locations}
        onSubmit={handleMoveSubmit}
        submitting={submitting}
      />
    </div>
  );
}
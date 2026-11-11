import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Product, StockCount, StockMovement, Location } from "@/entities/all";
import { Check, ScanLine, Pencil, Trash2, AlertTriangle, MapPin } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createStockMovement } from "@/lib/stockMovement";
import { getLocationEntries, hasLocation } from "@/lib/locations";
import { getTeamId } from "@/lib/team";
import { getUserName } from "@/lib/activity";
import { useToast } from "@/components/ui/use-toast";

export default function Inventaire() {
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [counting, setCounting] = useState(false);
  const [countItems, setCountItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [prods, pastCounts, locs] = await Promise.all([
      Product.list('-updated_date', 1000),
      StockCount.list('-created_date', 50),
      Location.list(),
    ]);
    setProducts(prods);
    setCounts(pastCounts);
    setLocations(locs);
    setLoading(false);
  };

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  const startCount = () => {
    setEditingId(null);
    let items;
    if (selectedLocationId) {
      items = products
        .filter((p) => hasLocation(p, selectedLocationId, locations))
        .map((p) => {
          const entry = getLocationEntries(p).find((e) => e.location_id === selectedLocationId);
          const locQty = entry?.quantity ?? 0;
          return {
            product_id: p.id,
            product_name: p.name,
            theoretical_qty: locQty,
            counted_qty: locQty,
            unit: p.unit || "",
          };
        });
    } else {
      items = products.map((p) => ({
        product_id: p.id,
        product_name: p.name,
        theoretical_qty: p.quantity ?? 0,
        counted_qty: p.quantity ?? 0,
        unit: p.unit || "",
      }));
    }
    items.sort((a, b) => (a.product_name || "").localeCompare(b.product_name || "", "fr", { sensitivity: "base" }));
    setCountItems(items);
    setNotes("");
    setCounting(true);
  };

  const cancelCount = () => {
    setCounting(false);
    setCountItems([]);
    setNotes("");
    setEditingId(null);
  };

  const editCount = (count) => {
    setCountItems((count.items || []).map((it) => ({ ...it })));
    setNotes(count.notes || "");
    setSelectedLocationId(count.location_id || "");
    setEditingId(count.id);
    setCounting(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await StockCount.delete(deleteId);
      toast({ title: "Inventaire supprimé" });
    } catch {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    } finally {
      setDeleteId(null);
      await loadData();
    }
  };

  const updateCountedQty = (idx, value) => {
    setCountItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, counted_qty: value === "" ? "" : parseInt(value, 10) || 0 } : it
      )
    );
  };

  const validateCount = async () => {
    setSubmitting(true);
    try {
      const items = countItems.map((it) => ({
        ...it,
        counted_qty: Number(it.counted_qty) || 0,
        gap: (Number(it.counted_qty) || 0) - (Number(it.theoretical_qty) || 0),
      }));
      const gapsCount = items.filter((it) => it.gap !== 0).length;

      if (editingId) {
        await StockCount.update(editingId, {
          notes,
          items,
          gaps_count: gapsCount,
        });
        toast({
          title: "Inventaire modifié",
          description: `${gapsCount} écart(s) constaté(s).`,
        });
      } else {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, "0");
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const yyyy = now.getFullYear();
        const date = `${yyyy}-${mm}-${dd}`;
        const reference = `INV-${dd}${mm}${yyyy}`;

        if (selectedLocationId) {
          // Inventaire par emplacement : ajuste la quantité de l'emplacement
          // et recalcule le stock total du produit.
          for (const it of items) {
            if (it.gap !== 0) {
              const product = products.find((p) => p.id === it.product_id);
              if (product) {
                const oldLocQty =
                  getLocationEntries(product).find((e) => e.location_id === selectedLocationId)?.quantity ?? 0;
                const newLocQty = it.counted_qty;
                const updatedLocations = getLocationEntries(product).map((e) =>
                  e.location_id === selectedLocationId ? { ...e, quantity: newLocQty } : e
                );
                const newTotal = (product.quantity ?? 0) + (newLocQty - oldLocQty);

                await StockMovement.create({
                  product_id: product.id,
                  product_name: product.name,
                  movement_type: "adjustment",
                  quantity: newLocQty,
                  previous_quantity: product.quantity ?? 0,
                  new_quantity: newTotal,
                  location_id: selectedLocationId,
                  reason: `Inventaire ${reference}`,
                  reference,
                  user_name: await getUserName(),
                  team_id: await getTeamId(),
                });

                await Product.update(product.id, { quantity: newTotal, locations: updatedLocations });
              }
            }
          }
        } else {
          // Inventaire global : ajuste le stock total du produit
          for (const it of items) {
            if (it.gap !== 0) {
              const product = products.find((p) => p.id === it.product_id);
              if (product) {
                await createStockMovement(product, {
                  movement_type: "adjustment",
                  quantity: it.counted_qty,
                  reason: `Inventaire ${reference}`,
                  reference,
                });
              }
            }
          }
        }

        await StockCount.create({
          reference,
          date,
          status: "completed",
          notes,
          items,
          gaps_count: gapsCount,
          location_id: selectedLocationId || null,
          location_name: selectedLocation?.name || null,
          user_name: await getUserName(),
          team_id: await getTeamId(),
        });

        toast({
          title: "Inventaire validé",
          description: `${gapsCount} écart(s) constaté(s).`,
        });
      }
      cancelCount();
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  // --- État : comptage en cours ---
  if (counting) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={cancelCount}
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:bg-emerald-700 transition-colors"
          style={{ minHeight: "unset" }}
        >
          Fermer
        </button>

        <div className="bg-card rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <h2 className="font-heading font-semibold text-foreground text-base">{editingId ? "Modifier le comptage" : "Nouveau comptage"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedLocationId
                ? `Emplacement : ${selectedLocation?.name || ""}`
                : "Saisissez la quantité réellement constatée."}
            </p>
          </div>

          {countItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun produit dans cet emplacement.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {countItems.map((it, idx) => {
                const gap = (Number(it.counted_qty) || 0) - (Number(it.theoretical_qty) || 0);
                return (
                  <div key={it.product_id || idx} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{it.product_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Stock théorique : {it.theoretical_qty}
                        {it.counted_qty !== "" && gap !== 0 && (
                          <span className={`ml-2 ${gap < 0 ? "text-red-500" : "text-emerald-600"}`}>
                            ({gap > 0 ? "+" : ""}{gap})
                          </span>
                        )}
                      </p>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={it.counted_qty}
                      onChange={(e) => updateCountedQty(idx, e.target.value)}
                      className="w-20 text-right px-2.5 py-2 rounded-lg border border-border/60 text-sm font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      style={{ minHeight: "unset", minWidth: "unset" }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <Textarea
              placeholder="Notes facultatives"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <button
            onClick={validateCount}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-sm active:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            style={{ minHeight: "unset" }}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validation...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {editingId ? "Enregistrer" : "Valider l'inventaire"}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- État : vue d'accueil ---
  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      {/* En-tête */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-emerald-700 uppercase">Contrôle</p>
        <h1 className="font-heading text-2xl font-semibold text-foreground mt-1">Inventaire</h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Comparez les quantités théoriques aux quantités réellement comptées.
        </p>
      </div>

      {/* Sélecteur d'emplacement */}
      {locations.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Emplacement
          </label>
          <Select value={selectedLocationId || "__all__"} onValueChange={(v) => setSelectedLocationId(v === "__all__" ? "" : v)}>
            <SelectTrigger
              className="w-full px-3 py-2.5 rounded-xl border border-border/60 bg-card text-sm font-medium text-foreground focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 h-auto"
              style={{ minHeight: "unset" }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les emplacements</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedLocationId && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Seuls les produits de cet emplacement seront comptés.
            </p>
          )}
        </div>
      )}

      {/* Lancer un inventaire */}
      <button
        onClick={startCount}
        disabled={loading || products.length === 0}
        className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        style={{ minHeight: "unset" }}
      >
        <ScanLine className="w-5 h-5" />
        Lancer un inventaire
      </button>

      {/* Historique */}
      <div>
        <h2 className="font-heading font-semibold text-foreground text-base mb-3">Historique des inventaires</h2>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : counts.length === 0 ? (
          <div className="border-2 border-dashed border-border/60 rounded-xl py-12 text-center">
            <p className="text-sm text-muted-foreground">Aucun inventaire effectué.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {counts.map((c) => (
              <div
                key={c.id}
                className="bg-card rounded-xl shadow-sm p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{c.reference}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(c.date).toLocaleDateString("fr-FR")} · {c.items?.length || 0} produit(s)
                    {c.location_name && ` · ${c.location_name}`}
                  </p>
                </div>
                {c.gaps_count > 0 ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium whitespace-nowrap">
                    {c.gaps_count} écart(s)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium whitespace-nowrap">
                    Conforme
                  </span>
                )}
                <button
                  onClick={() => editCount(c)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-gray-600 transition-colors flex-shrink-0"
                  style={{ minHeight: "unset", minWidth: "unset" }}
                  aria-label="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(c.id)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                  style={{ minHeight: "unset", minWidth: "unset" }}
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation de suppression */}
      {deleteId && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setDeleteId(null)}>
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Supprimer l'inventaire ?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl bg-muted text-foreground font-medium text-sm active:bg-gray-200 transition-colors"
                style={{ minHeight: "unset" }}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium text-sm active:bg-red-600 transition-colors"
                style={{ minHeight: "unset" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
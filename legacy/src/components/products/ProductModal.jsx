import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2 } from "lucide-react";
import { Product, Category, Location, Supplier, StockMovement } from "@/entities/all";
import { getTeamSettings } from "@/lib/teamSettings";
import SearchableSelect from "@/components/SearchableSelect";
import SupplierMultiSelect from "@/components/suppliers/SupplierMultiSelect";
import LocationStockSelect from "@/components/products/LocationStockSelect";
import { getTeamId } from "@/lib/team";
import { logActivity, getUserName } from "@/lib/activity";
import { sumLocationStock } from "@/lib/locations";
import { syncStockAlert } from "@/lib/stockAlerts";

function generateRef(name) {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const abbr = words.map((w) => w.substring(0, 3).toUpperCase()).join("-");
  return `${abbr}-0001`;
}

const emptyForm = {
  name: "",
  sku: "",
  quantity: "",
  cost_price: "",
  unit_price: "",
  category_id: "",
  reorder_level: "",
  unit: "Pcs",
  locations: [],
  supplier: "",
  suppliers: [],
  description: "",
};

export default function ProductModal({ open, editProduct, onClose, onSaved }) {
  const isEdit = !!editProduct;
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    Category.list().then(setCategories);
    if (isEdit && editProduct) {
      // Préselection immédiate (synchrone) : le fournisseur legacy s'affiche
      // tout de suite dans le multi-select, et les emplacements connus par ID
      // sont présélectionnés.
      let suppliersArr = Array.isArray(editProduct.suppliers) ? editProduct.suppliers : [];
      if (suppliersArr.length === 0 && editProduct.supplier) {
        suppliersArr = [{ name: editProduct.supplier, reference: editProduct.supplier_reference || "" }];
      }
      let formLocations = Array.isArray(editProduct.locations) ? editProduct.locations : [];
      if (formLocations.length === 0 && Array.isArray(editProduct.location_ids) && editProduct.location_ids.length) {
        formLocations = editProduct.location_ids.map((id) => ({ location_id: id, quantity: editProduct.quantity ?? 0 }));
      }
      setForm({
        name: editProduct.name || "",
        sku: editProduct.sku || "",
        quantity: editProduct.quantity ?? "",
        cost_price: editProduct.cost_price ?? "",
        unit_price: editProduct.unit_price ?? "",
        category_id: editProduct.category_id || "",
        reorder_level: editProduct.reorder_level ?? "",
        unit: editProduct.unit || "Pcs",
        locations: formLocations,
        supplier: editProduct.supplier || "",
        suppliers: suppliersArr,
        description: editProduct.description || "",
      });
      setCategoryInput("");

      // En arrière-plan : créer les fiches Fournisseur/Emplacement manquantes
      // pour qu'elles apparaissent dans les listes déroulantes, et lier les IDs.
      (async () => {
        let locationsData = await Location.list();
        if ((!Array.isArray(editProduct.locations) || editProduct.locations.length === 0)
            && (!Array.isArray(editProduct.location_ids) || editProduct.location_ids.length === 0)
            && editProduct.location) {
          let loc = locationsData.find((l) => l.name.toLowerCase() === editProduct.location.toLowerCase());
          if (!loc) {
            try {
              loc = await Location.create({ name: editProduct.location, team_id: await getTeamId() });
              locationsData = [...locationsData, loc];
            } catch {}
          }
          if (loc) {
            setForm((prev) => ({ ...prev, locations: [{ location_id: loc.id, quantity: editProduct.quantity ?? 0 }] }));
          }
        }
        setLocations(locationsData);

        if (suppliersArr.length > 0 && suppliersArr[0].name && !suppliersArr[0].supplier_id) {
          try {
            let suppliersData = await Supplier.list();
            let sup = suppliersData.find((s) => s.name.toLowerCase() === suppliersArr[0].name.toLowerCase());
            if (!sup) {
              try { sup = await Supplier.create({ name: suppliersArr[0].name, team_id: await getTeamId() }); } catch {}
            }
            if (sup) {
              setForm((prev) => ({
                ...prev,
                suppliers: [{ supplier_id: sup.id, name: suppliersArr[0].name, reference: prev.suppliers[0]?.reference || "" }],
              }));
            }
          } catch {}
        }
      })();
    } else {
      Location.list().then(setLocations);
      getTeamSettings().then((s) => {
        if (s?.default_unit) setForm((prev) => ({ ...prev, unit: s.default_unit }));
        if (s?.product_ref_auto) {
          const ref = generateRef("");
          if (ref) setForm((prev) => ({ ...prev, sku: ref }));
        }
      });
      setForm(emptyForm);
      setCategoryInput("");
    }
  }, [open, editProduct, isEdit]);

  // Resolve category display name once the categories list is loaded (edit mode)
  useEffect(() => {
    if (isEdit && editProduct?.category_id && categories.length && !categoryInput) {
      const c = categories.find((x) => x.id === editProduct.category_id);
      if (c) setCategoryInput(c.name);
    }
  }, [isEdit, editProduct, categories, categoryInput]);

  const set = (field, value) =>
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (!isEdit && field === "name") updated.sku = generateRef(value);
      return updated;
    });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let categoryId = form.category_id;
      if (!categoryId && categoryInput.trim()) {
        const existing = categories.find(
          (c) => c.name.toLowerCase() === categoryInput.trim().toLowerCase()
        );
        if (existing) categoryId = existing.id;
        else {
          const nc = await Category.create({ name: categoryInput.trim(), team_id: await getTeamId() });
          categoryId = nc.id;
        }
      }
      const suppliersArr = form.suppliers || [];
      const primary = suppliersArr[0];
      const payload = {
        ...form,
        supplier: primary?.name || "",
        supplier_reference: primary?.reference || "",
        suppliers: suppliersArr,
        quantity: form.quantity === "" ? 0 : Number(form.quantity),
        reorder_level: form.reorder_level === "" ? undefined : Number(form.reorder_level),
        cost_price: form.cost_price === "" ? undefined : Number(form.cost_price),
        unit_price: form.unit_price === "" ? undefined : Number(form.unit_price),
        category_id: categoryId,
      };

      if (isEdit) {
        await Product.update(editProduct.id, payload);
        const newQty = payload.quantity ?? 0;
        const prevQty = editProduct.quantity ?? 0;
        if (newQty !== prevQty) {
          await StockMovement.create({
            product_id: editProduct.id,
            product_name: form.name,
            movement_type: "adjustment",
            quantity: newQty,
            previous_quantity: prevQty,
            new_quantity: newQty,
            location_id: null,
            user_name: await getUserName(),
            team_id: await getTeamId(),
          });
          syncStockAlert({ ...editProduct, quantity: newQty, locations: payload.locations || [] });
        } else {
          logActivity({ action_type: "update", entity_type: "product", entity_id: editProduct.id, description: `Article modifié : ${form.name}`, metadata: { name: form.name } });
        }
      } else {
        const created = await Product.create({ ...payload, team_id: await getTeamId() });
        logActivity({ action_type: "create", entity_type: "product", entity_id: created.id, description: `Article créé : ${form.name}`, metadata: { name: form.name } });
      }
      onClose();
      onSaved?.();
    } catch (err) {
      alert("Erreur : " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !editProduct) return;
    if (!window.confirm(`Supprimer « ${editProduct.name} » ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await Product.delete(editProduct.id);
      logActivity({ action_type: "delete", entity_type: "product", entity_id: editProduct.id, description: `Article supprimé : ${editProduct.name}` });
      onClose();
      onSaved?.();
    } catch (err) {
      alert("Erreur : " + (err?.message || err));
    } finally {
      setDeleting(false);
    }
  };

  const title = isEdit ? "Modifier le produit" : "Nouveau produit";

  const formBody = (
    <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#F5F3F2] dark:bg-background">
            <section>
              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Informations
              </p>
              <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 shadow-sm p-3 space-y-3">
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    required
                    placeholder="Ex: Café 1kg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Référence (SKU)</Label>
                    <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="SKU-001" />
                  </div>
                  <div>
                    <Label>Catégorie</Label>
                    <SearchableSelect
                      value={categoryInput}
                      placeholder="—"
                      items={categories.map((c) => ({ value: c.id, label: c.name }))}
                      onChange={(text) => {
                        setCategoryInput(text);
                        setForm((prev) => ({ ...prev, category_id: "" }));
                      }}
                      onSelect={(item) => {
                        setCategoryInput(item.label);
                        setForm((prev) => ({ ...prev, category_id: item.value }));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                {categoryInput && !form.category_id && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    La catégorie « {categoryInput} » sera créée automatiquement
                  </p>
                )}
              </div>
            </section>

            <section>
              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Prix
              </p>
              <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 shadow-sm p-3 grid grid-cols-2 gap-2">
                <div>
                  <Label>Prix de vente</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unit_price}
                    onChange={(e) => set("unit_price", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Prix de revient</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price}
                    onChange={(e) => set("cost_price", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </section>

            <section>
              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Stock
              </p>
              <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 shadow-sm p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Quantité{isEdit && editProduct?.quantity != null ? ` (${editProduct.quantity})` : ""}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) => set("quantity", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Seuil d'alerte</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.reorder_level}
                      onChange={(e) => set("reorder_level", e.target.value)}
                      placeholder="5"
                    />
                  </div>
                </div>
                <div>
                  <Label>Unité</Label>
                  <Input
                    value={form.unit}
                    onChange={(e) => set("unit", e.target.value)}
                    placeholder="Pcs, kg, litres..."
                  />
                </div>
                <div>
                  <Label>Emplacement</Label>
                  <LocationStockSelect
                    value={form.locations}
                    onChange={(entries) => setForm((prev) => ({ ...prev, locations: entries, quantity: sumLocationStock(entries) }))}
                    locations={locations}
                  />
                </div>
              </div>
            </section>

            <section>
              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Fournisseur
              </p>
              <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 shadow-sm p-3">
                <SupplierMultiSelect
                  value={form.suppliers}
                  onChange={(arr) => set("suppliers", arr)}
                />
              </div>
            </section>

            <section>
              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <div className="rounded-2xl bg-card border border-black/5 dark:border-white/10 shadow-sm p-3">
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Description du produit"
                  rows={3}
                />
              </div>
            </section>
          </div>

          <div className="flex items-center gap-3 px-4 pt-3 pb-4 shrink-0 border-t border-black/5 dark:border-white/10 bg-card">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="shrink-0 w-11 h-11 rounded-xl bg-black/[0.05] dark:bg-white/10 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                style={{ minHeight: "unset", minWidth: "unset" }}
                aria-label="Supprimer"
              >
                {deleting ? <Loader2 className="w-5 h-5 text-red-500 animate-spin" /> : <Trash2 className="w-5 h-5 text-red-500" />}
              </button>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 text-base font-semibold"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
    </form>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
          <DrawerContent className="max-h-[92vh] p-0">
            <DrawerHeader className="px-5 pt-3 pb-2 shrink-0 border-b border-black/5 dark:border-white/10 text-center">
              <DrawerTitle className="text-lg font-bold">{title}</DrawerTitle>
            </DrawerHeader>
            {formBody}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="max-w-md flex flex-col max-h-[90vh] p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-black/5 dark:border-white/10">
              <DialogTitle className="text-center text-lg font-bold">
                {title}
              </DialogTitle>
            </DialogHeader>
            {formBody}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
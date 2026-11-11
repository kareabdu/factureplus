import React, { useState, useEffect } from "react";
import { Product, Category, Location, Settings } from "@/entities/all";
import { getTeamSettings } from "@/lib/teamSettings";
import { generateProductRef, productRefUsesCounter } from "@/lib/productRef";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SearchableSelect from "@/components/SearchableSelect";
import SupplierMultiSelect from "@/components/suppliers/SupplierMultiSelect";
import LocationStockSelect from "@/components/products/LocationStockSelect";
import { getTeamId } from "@/lib/team";
import { logActivity } from "@/lib/activity";
import { distributeQuantityToLocations, sumLocationStock } from "@/lib/locations";

function generateRef(name) {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const abbr = words.map(w => w.substring(0, 3).toUpperCase()).join("-");
  return `${abbr}-0001`;
}

function Row({ label, children }) {
  return (
    <label className="p-4 flex items-center justify-between cursor-text">
      <span className="text-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function AddProduct() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    category_id: "",
    quantity: "",
    reorder_level: "",
    unit_price: "",
    cost_price: "",
    supplier: "",
    supplier_reference: "",
    suppliers: [],
    description: "",
    unit: "Pcs",
    locations: []
  });

  useEffect(() => {
    loadCategories();
    loadLocations();
    loadDefaultUnit();
  }, []);

  const loadCategories = async () => {
    const data = await Category.list();
    setCategories(data);
  };

  const loadLocations = async () => {
    const data = await Location.list();
    setLocations(data);
  };

  const [refSettings, setRefSettings] = useState(null);

  const loadDefaultUnit = async () => {
    try {
      const s = await getTeamSettings();
      setRefSettings(s);
      if (s?.default_unit) {
        setFormData(prev => ({ ...prev, unit: s.default_unit }));
      }
      if (s?.product_ref_auto) {
        const ref = generateProductRef(s, "");
        if (ref) setFormData(prev => ({ ...prev, sku: ref }));
      }
    } catch (e) { /* ignore */ }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "name") {
        if (refSettings?.product_ref_auto) {
          updated.sku = generateProductRef(refSettings, value);
        } else if (!refSettings) {
          updated.sku = generateRef(value);
        }
      }
      // Stock actuel est le boss : il pilote les quantités par emplacement.
      if (field === "quantity" && Array.isArray(prev.locations) && prev.locations.length > 0) {
        updated.locations = distributeQuantityToLocations(prev.locations, value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let categoryId = formData.category_id;
      if (!categoryId && categoryInput.trim()) {
        const existing = categories.find(c => c.name.toLowerCase() === categoryInput.trim().toLowerCase());
        if (existing) {
          categoryId = existing.id;
        } else {
          const newCat = await Category.create({ name: categoryInput.trim(), team_id: await getTeamId() });
          categoryId = newCat.id;
        }
      }
      const suppliersArr = formData.suppliers || [];
      const primary = suppliersArr[0];
      const payload = {
        ...formData,
        team_id: await getTeamId(),
        supplier: primary?.name || "",
        supplier_reference: primary?.reference || "",
        suppliers: suppliersArr,
        quantity: formData.quantity === "" ? undefined : Number(formData.quantity),
        reorder_level: formData.reorder_level === "" ? undefined : Number(formData.reorder_level),
        cost_price: formData.cost_price === "" ? undefined : Number(formData.cost_price),
        unit_price: formData.unit_price === "" ? undefined : Number(formData.unit_price),
        category_id: categoryId,
      };
      const created = await Product.create(payload);
      if (refSettings?.product_ref_auto && refSettings?.id && productRefUsesCounter(refSettings)) {
        try {
          await Settings.update(refSettings.id, { product_ref_next_number: (refSettings.product_ref_next_number || 1) + 1 });
        } catch { /* ignore */ }
      }
      logActivity({ action_type: "create", entity_type: "product", entity_id: created.id, description: `Article créé : ${formData.name}`, metadata: { name: formData.name } });
      navigate(createPageUrl("Products"));
    } catch (error) {
      alert("Erreur lors de l'enregistrement : " + (error?.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "bg-transparent outline-none border-0 text-right text-foreground text-sm placeholder:text-muted-foreground";

  const locationSum = sumLocationStock(formData.locations);
  const hasLocationMismatch = Array.isArray(formData.locations) && formData.locations.length > 0
    && formData.quantity !== "" && Number(formData.quantity) !== locationSum;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 md:py-8 space-y-3">
        <div className="hidden md:flex items-center gap-4 mb-2">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Products"))} className="shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Nouveau produit</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-card rounded-2xl shadow-sm divide-y divide-border/60">
            <label className="p-4 block cursor-text">
              <input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="Nom article/produit/service"
                className="w-full text-base text-foreground bg-transparent outline-none border-0 placeholder:text-muted-foreground"
              />
            </label>

            <Row label="REF (auto)">
              <input value={formData.sku} onChange={(e) => handleInputChange('sku', e.target.value)} placeholder="Générée automatiquement" className={`w-44 ${inputCls}`} />
            </Row>

            <Row label="Stock actuel">
            <input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              placeholder="0"
              className={`w-24 ${inputCls}`}
            />
            </Row>

            <Row label="Prix de revient">
              <input type="number" min="0" step="0.01" value={formData.cost_price} onChange={(e) => handleInputChange('cost_price', e.target.value)} placeholder="0.00" className={`w-28 ${inputCls}`} />
            </Row>

            <Row label="Prix de vente">
              <input type="number" min="0" step="0.01" value={formData.unit_price} onChange={(e) => handleInputChange('unit_price', e.target.value)} placeholder="0.00" className={`w-28 ${inputCls}`} />
            </Row>

            <Row label="Catégorie">
              <SearchableSelect
                value={categoryInput}
                placeholder="Saisir ou choisir..."
                items={categories.map(c => ({ value: c.id, label: c.name }))}
                onChange={(text) => { setCategoryInput(text); setFormData(prev => ({ ...prev, category_id: "" })); }}
                onSelect={(item) => { setCategoryInput(item.label); setFormData(prev => ({ ...prev, category_id: item.value })); }}
                className="w-48 [&_input]:border-0 [&_input]:bg-transparent [&_input]:shadow-none [&_input]:focus-visible:ring-0"
              />
            </Row>

            <Row label="Seuil de réappro">
              <input type="number" min="0" value={formData.reorder_level} onChange={(e) => handleInputChange('reorder_level', e.target.value)} placeholder="10" className={`w-24 ${inputCls}`} />
            </Row>

            <Row label="Unité">
              <input
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                placeholder="Pcs, kg, litres..."
                className="text-right text-foreground bg-transparent outline-none border-0 w-32 placeholder:text-muted-foreground"
              />
            </Row>

            <div className="p-4">
              <span className="text-sm font-medium text-foreground block mb-2">Emplacements</span>
              <LocationStockSelect
                value={formData.locations}
                onChange={(entries) => setFormData((prev) => ({ ...prev, locations: entries }))}
                locations={locations}
              />
              {hasLocationMismatch && (
                <p className="text-xs text-red-600 mt-2">
                  Le Stock actuel ({formData.quantity}) ne correspond pas à la somme des emplacements ({locationSum}).
                </p>
              )}
            </div>

            <div className="p-4">
              <span className="text-sm font-medium text-foreground block mb-2">Fournisseur(s)</span>
              <SupplierMultiSelect
                value={formData.suppliers}
                onChange={(arr) => handleInputChange('suppliers', arr)}
              />
            </div>
          </div>

          {categoryInput && !formData.category_id && (
            <p className="px-1 text-xs text-emerald-600">La catégorie "{categoryInput}" sera créée automatiquement</p>
          )}

          <label className="block bg-card rounded-2xl shadow-sm p-4 cursor-text">
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Description du produit"
              rows={4}
              className="w-full text-sm text-foreground bg-transparent outline-none border-0 resize-none placeholder:text-muted-foreground"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading || hasLocationMismatch}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-2xl shadow-sm disabled:opacity-60 transition-colors"
          >
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}
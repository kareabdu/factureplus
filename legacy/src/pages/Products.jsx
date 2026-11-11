import React, { useState, useEffect, useRef, useCallback } from "react";
import { Product, Category, Location } from "@/entities/all";
import { getTeamSettings } from "@/lib/teamSettings";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Grid3x3, List, Upload, Loader2, FileDown, Trash2, X, ShoppingCart } from "lucide-react";
import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";
import { logActivity } from "@/lib/activity";
import { getLocationStock, hasLocation } from "@/lib/locations";
import { useToast } from "@/components/ui/use-toast";

import ProductCard from "../components/products/ProductCard";
import StockToolbar from "../components/products/StockToolbar";
import ProductModal from "../components/products/ProductModal";
import ProductDesktopTable from "../components/products/ProductDesktopTable";
import QuickStockMovementDialog from "../components/products/QuickStockMovementDialog";
import { createStockMovement } from "@/lib/stockMovement";
import { setVisibleProductIds } from "@/lib/visibleProducts";
import usePersistedSearch from "@/hooks/usePersistedSearch";
import Fab from "@/components/Fab";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = usePersistedSearch("search_products");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("products_view_mode") || "grid");
  const [isLoading, setIsLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("");
  const fileInputRef = useRef(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const openCreate = () => { setEditProduct(null); setShowProductModal(true); };
  const openEdit = (product) => { setEditProduct(product); setShowProductModal(true); };
  const closeModal = () => { setShowProductModal(false); setEditProduct(null); };
  const [moveProduct, setMoveProduct] = useState(null);
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  // Désactive temporairement les boutons PDF et Importer (réactivable)
  const EXPORT_IMPORT_DISABLED = true;

  const handleMoveSubmit = async (data) => {
    if (!moveProduct) return;
    setMoveSubmitting(true);
    try {
      await handleMove(moveProduct, data);
      setMoveProduct(null);
    } finally {
      setMoveSubmitting(false);
    }
  };
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Ajustement inline ±1 depuis la carte produit.
  // Mise à jour optimiste : la quantité affichée change immédiatement,
  // la synchronisation backend se fait en arrière-plan.
  // Saisie directe de la quantité depuis le stepper inline (sans ouvrir le formulaire).
  // Crée un mouvement d'ajustement et met à jour la quantité de façon optimiste.
  const handleSetQuantity = async (product, newQty) => {
    const prevQty = product.quantity ?? 0;
    if (newQty === prevQty) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, quantity: newQty } : p))
    );
    try {
      const locs = Array.isArray(product.locations) ? product.locations : [];
      // Emplacement unique → on ajuste aussi l'emplacement ; sinon quantité globale seule.
      const location_id = locs.length === 1 ? locs[0].location_id : null;
      const { updatedLocations } = await createStockMovement(product, {
        movement_type: "adjustment",
        quantity: newQty,
        location_id,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, locations: updatedLocations } : p))
      );
    } catch (err) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, quantity: prevQty } : p))
      );
      toast({ title: "Erreur", description: err?.message || "Mise à jour impossible", variant: "destructive" });
    }
  };

  const handleMove = async (product, data) => {
    try {
      const { updatedLocations } = await createStockMovement(product, data);
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== product.id) return p;
          const qty = data.movement_type === "in"
            ? (p.quantity || 0) + data.quantity
            : data.movement_type === "out"
            ? Math.max(0, (p.quantity || 0) - data.quantity)
            : data.quantity;
          return { ...p, quantity: qty, locations: updatedLocations ?? p.locations };
        })
      );
    } catch (err) {
      toast({ title: "Erreur", description: err?.message || "Mouvement impossible", variant: "destructive" });
      throw err;
    }
  };

  const handleStep = async (product, type) => {
    const delta = type === "in" ? 1 : -1;
    const prevQty = product.quantity ?? 0;
    const newQty = Math.max(0, prevQty + delta);
    if (newQty === prevQty) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, quantity: newQty } : p))
    );
    try {
      const locs = Array.isArray(product.locations) ? product.locations : [];
      // Emplacement unique → on ajuste aussi l'emplacement ; sinon quantité globale seule.
      const location_id = locs.length === 1 ? locs[0].location_id : null;
      const { updatedLocations } = await createStockMovement(product, { movement_type: "adjustment", quantity: newQty, location_id });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, locations: updatedLocations } : p))
      );
    } catch (err) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, quantity: prevQty } : p))
      );
      toast({ title: "Erreur", description: err?.message || "Mise à jour impossible", variant: "destructive" });
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [productsData, categoriesData, locationsData] = await Promise.all([
      Product.list('-updated_date'),
      Category.list(),
      Location.list(),
    ]);
    setProducts(productsData);
    setCategories(categoriesData);
    setLocations(locationsData);
    const s = await getTeamSettings();
    if (s) setCurrencySymbol(s.currency_symbol || "");
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProducts = products.filter(product => {
    const q = searchTerm.toLowerCase();
    const supplierText = (product.suppliers || []).map((s) => `${s.name || ""} ${s.reference || ""}`).join(" ").toLowerCase();
    const locIds = [
      ...(product.locations || []).map((l) => l.location_id).filter(Boolean),
      ...(product.location_ids || []).filter(Boolean),
    ];
    const locationText = [
      ...locIds.map((id) => locations.find((l) => l.id === id)?.name || ""),
      product.location || "",
    ].join(" ").toLowerCase();
    const matchesSearch = (product.name || "").toLowerCase().includes(q) ||
                         (product.sku || "").toLowerCase().includes(q) ||
                         (product.supplier || "").toLowerCase().includes(q) ||
                         (product.supplier_reference || "").toLowerCase().includes(q) ||
                         supplierText.includes(q) ||
                         locationText.includes(q);
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
    const matchesLocation = selectedLocation === "all" || hasLocation(product, selectedLocation, locations);
    return matchesSearch && matchesCategory && matchesLocation;
  })
  .slice()
  .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" }));

  // Mémorise les articles actuellement affichés (filtres compris) pour la cloche,
  // conservés sur les autres pages de l'app.
  useEffect(() => {
    setVisibleProductIds(filteredProducts.map((p) => p.id));
  }, [filteredProducts]);

  const getCategoryById = (categoryId) => {
    return categories.find(c => c.id === categoryId);
  };

  const TEMPLATE_URL = "https://media.base44.com/files/public/6a3b047b6054a9a30af8781d/44a6e6ab9_article.xlsx";

  const downloadTemplate = async () => {
    try {
      const resp = await fetch(TEMPLATE_URL);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_articles.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Template download error:", err);
    }
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      // Lecture du fichier côté client puis envoi du contenu (base64) au
      // backend : aucun fichier n'est stocké sur le serveur.
      const file_content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          const comma = result.indexOf(",");
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await base44.functions.invoke('importProducts', { file_content });
      logActivity({ action_type: "import", entity_type: "product", description: "Import d'articles" });
      await loadData();
      const result = res?.data ?? res ?? {};
      const created = result.created ?? 0;
      const skipped = result.skipped ?? 0;
      toast({
        title: created > 0 ? "Import terminé" : "Aucun nouvel article",
        description: skipped > 0
          ? `${created} article(s) importé(s), ${skipped} doublon(s) ignoré(s).`
          : `${created} article(s) importé(s).`,
      });
    } catch (err) {
      console.error("Import error:", err);
      toast({ title: "Erreur d'import", description: err?.message || "Échec de l'import", variant: "destructive" });
    }
    setImporting(false);
    e.target.value = "";
  };
  const handleCSVImport = handleExcelImport;

  const handleExportPDF = () => {
    const rows = filteredProducts;
    if (!rows.length) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 24;
    let y = 40;
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.text("Liste des articles", margin, y);
    doc.setFontSize(9);
    doc.setTextColor(120);
    y += 10;

    const locFilter = selectedLocation !== "all" ? selectedLocation : null;
    const locFilterName = locFilter ? (locations.find((l) => l.id === locFilter)?.name || "") : null;

    const expanded = rows.flatMap((p) => {
      const stock = getLocationStock(p, locations);
      const catName = getCategoryById(p.category_id)?.name || "";
      const price = p.unit_price != null ? `${Number(p.unit_price).toLocaleString("fr-FR").replace(/\s/g, ".")} ${currencySymbol}`.trim() : "";
      if (stock.length) {
        const filtered = locFilter ? stock.filter((s) => s.id === locFilter) : stock;
        if (filtered.length) {
          return filtered.map((s) => ({ name: p.name, sku: p.sku, categoryName: catName, qty: s.quantity, price, location: s.name }));
        }
        return [];
      }
      if (locFilter) return [];
      return [{ name: p.name, sku: p.sku, categoryName: catName, qty: p.quantity, price, location: p.location || "" }];
    });

    doc.text(`${expanded.length} ligne(s) — ${rows.length} article(s)${locFilterName ? ` — ${locFilterName}` : ""} — ${new Date().toLocaleDateString("fr-FR")}`, margin, y);
    y += 16;

    const cols = [
      { title: "Nom", key: "name", w: 180 },
      { title: "REF", key: "sku", w: 90 },
      { title: "Catégorie", key: "categoryName", w: 110 },
      { title: "Qté", key: "qty", w: 50, align: "right" },
      { title: "Prix", key: "price", w: 80, align: "right" },
      { title: "Emplacement", key: "location", w: 120 },
    ];
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const colX = cols.map((c, i) => margin + cols.slice(0, i).reduce((s, x) => s + x.w, 0));

    const rowH = 20;
    // header
    doc.setFillColor(5, 150, 105);
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.rect(margin, y - 12, tableW, rowH, "F");
    cols.forEach((c, i) => {
      const x = c.align === "right" ? colX[i] + c.w - 6 : colX[i] + 6;
      doc.text(c.title, x, y, { align: c.align === "right" ? "right" : "left" });
    });
    y += rowH;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    expanded.forEach((r, idx) => {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin + rowH;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 12, tableW, rowH, "F");
      }
      cols.forEach((c, i) => {
        let val = r[c.key];
        if (c.key === "qty" && val != null) val = Number(val).toLocaleString("fr-FR").replace(/\s/g, ".");
        val = val == null ? "" : String(val);
        const x = c.align === "right" ? colX[i] + c.w - 6 : colX[i] + 6;
        doc.text(val.slice(0, 40), x, y, { align: c.align === "right" ? "right" : "left" });
      });
      y += rowH;
    });

    doc.save("articles.pdf");
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredProducts.map(p => p.id)));
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!window.confirm(`Supprimer ${ids.length} article(s) ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await Product.deleteMany({ id: { $in: ids } });
      logActivity({ action_type: "delete", entity_type: "product", description: `Suppression de ${ids.length} article(s)` });
      setSelectedIds(new Set());
      await loadData();
      toast({ title: "Articles supprimés", description: `${ids.length} article(s) supprimé(s).` });
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Desktop header + toolbar */}
        <div className="hidden lg:flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Stock</h1>
              <p className="text-muted-foreground mt-1">{filteredProducts.length} article{filteredProducts.length > 1 ? "s" : ""} en stock</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-card rounded-lg p-1 shadow-sm border border-border/60">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => { setViewMode("grid"); localStorage.setItem("products_view_mode", "grid"); }}
                  className={viewMode === "grid" ? "bg-emerald-600" : ""}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => { setViewMode("list"); localStorage.setItem("products_view_mode", "list"); }}
                  className={viewMode === "list" ? "bg-emerald-600" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
              <Button
                variant="outline"
                size="sm"
                className="shadow"
                disabled={EXPORT_IMPORT_DISABLED || importing}
                onClick={() => fileInputRef.current?.click()}
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span className="ml-2">{importing ? "Import..." : "Importer"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="shadow"
                disabled={EXPORT_IMPORT_DISABLED || filteredProducts.length === 0}
                onClick={handleExportPDF}
              >
                <FileDown className="w-4 h-4" />
                <span className="ml-2">Exporter PDF</span>
              </Button>
              <Link
                to="/NewPurchase"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-card border border-emerald-600/40 text-emerald-700 dark:text-emerald-400 text-sm font-semibold shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                Nouvel achat
              </Link>
              <Button
                size="sm"
                onClick={openCreate}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvel article
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile: actions rapides */}
        <div className="flex lg:hidden items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">
            {filteredProducts.length} article{filteredProducts.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleExportPDF}
              disabled={EXPORT_IMPORT_DISABLED || filteredProducts.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-card border border-black/5 dark:border-white/10 text-xs font-semibold text-foreground shadow-sm disabled:opacity-50"
              style={{ minHeight: "unset", minWidth: "unset" }}
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={EXPORT_IMPORT_DISABLED || importing}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-card border border-black/5 dark:border-white/10 text-xs font-semibold text-foreground shadow-sm disabled:opacity-50"
              style={{ minHeight: "unset", minWidth: "unset" }}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importer
            </button>
            <Link
              to="/NewPurchase"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-sm"
              style={{ minHeight: "unset", minWidth: "unset" }}
            >
              <ShoppingCart className="w-4 h-4" />
              Achat
            </Link>
          </div>
        </div>

        <StockToolbar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
          products={products}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          locations={locations}
        />

        {selectedIds.size > 0 && (
          <div className="sticky top-0 z-20 mb-3 flex items-center gap-2 bg-card border border-border/60 rounded-xl shadow-sm px-3 py-2">
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.size}
            </span>
            <span className="text-xs text-muted-foreground mr-auto">
              sélectionné{selectedIds.size > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={selectAll}
              disabled={filteredProducts.length === 0}
              className="text-xs font-medium text-foreground px-2 py-1 rounded-md hover:bg-muted disabled:opacity-50"
              style={{ minHeight: "unset", minWidth: "unset" }}
            >
              Tout
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              style={{ minHeight: "unset", minWidth: "unset" }}
              aria-label="Supprimer"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted"
              style={{ minHeight: "unset", minWidth: "unset" }}
              aria-label="Annuler"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoading ? null : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Aucun article trouvé</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl"
              style={{ minHeight: "unset", minWidth: "unset" }}
            >
              <Plus className="w-4 h-4" />
              Ajouter un article
            </button>
          </div>
        ) : (
          <>
            {viewMode === "list" && (
              <ProductDesktopTable
                products={filteredProducts}
                categories={categories}
                locations={locations}
                currencySymbol={currencySymbol}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onEdit={openEdit}
                onMove={setMoveProduct}
                onStep={handleStep}
                onSetQuantity={handleSetQuantity}
              />
            )}
            <div className={`grid gap-3 lg:gap-6 ${
              viewMode === "grid"
                ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1 lg:hidden"
            }`}>
              {filteredProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  category={getCategoryById(product.category_id)}
                  locations={locations}
                  currencySymbol={currencySymbol}
                  onDelete={loadData}
                  selected={selectedIds.has(product.id)}
                  onToggleSelect={() => toggleSelect(product.id)}
                  onStep={handleStep}
                  onSetQuantity={handleSetQuantity}
                  onOpen={(p) => navigate(`/ProductDetail?id=${p.id}`)}
                  onMove={setMoveProduct}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bouton flottant "Nouvel article" (mobile/tablette) */}
      <Fab
        onClick={openCreate}
        ariaLabel="Nouvel article"
        className="lg:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-emerald-600 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: "calc(88px + env(safe-area-inset-bottom))", minHeight: "unset", minWidth: "unset" }}
      />

      <ProductModal
        open={showProductModal}
        editProduct={editProduct}
        onClose={closeModal}
        onSaved={loadData}
      />

      <QuickStockMovementDialog
        open={!!moveProduct}
        onOpenChange={(v) => { if (!v) setMoveProduct(null); }}
        product={moveProduct}
        locations={locations}
        onSubmit={handleMoveSubmit}
        submitting={moveSubmitting}
      />
    </div>
  );
}
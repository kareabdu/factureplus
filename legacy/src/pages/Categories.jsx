import React, { useState, useEffect } from "react";
import { Category, Product } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import CategoryModal from "@/components/categories/CategoryModal";
import ProductModal from "@/components/products/ProductModal";
import Fab from "@/components/Fab";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const openProduct = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };
  const closeProductModal = () => { setShowProductModal(false); setEditingProduct(null); };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [categoriesData, productsData] = await Promise.all([
      Category.list(),
      Product.list(),
    ]);
    setCategories(categoriesData);
    setProducts(productsData);
    setIsLoading(false);
  };

  const productsByCategory = (categoryId) =>
    products.filter((p) => p.category_id === categoryId);

  const filteredCategories = categories.filter((c) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (c.name || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  });

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleDelete = async (category) => {
    const count = productsByCategory(category.id).length;
    if (!window.confirm(`Supprimer la catégorie « ${category.name} »${count ? ` ? ${count} article(s) resteront sans catégorie.` : " ?"}`)) return;
    setDeletingId(category.id);
    try {
      await Category.delete(category.id);
      await loadData();
    } catch (err) {
      alert("Erreur : " + (err?.message || err));
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => {
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-2 hidden md:block">
              Catégories
            </h1>
          </div>
          <Button
            onClick={openCreate}
            className="hidden md:inline-flex bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter une catégorie
          </Button>
        </div>

        <SearchInput
          className="mb-6 max-w-md"
          placeholder="Rechercher une catégorie..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-muted-foreground">Chargement...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Aucune catégorie trouvée</p>
            <Button
              onClick={openCreate}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Ajouter une catégorie
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCategories.map((category) => {
              const catProducts = productsByCategory(category.id);
              return (
                <Card
                  key={category.id}
                  className="shadow-sm border border-border/60 hover:shadow-md transition-shadow"
                >
                  <CardHeader className="border-b border-border/60">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {category.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">{catProducts.length}</Badge>
                        <button
                          onClick={() => handleEdit(category)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardTitle>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    {catProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun article dans cette catégorie
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {catProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => openProduct(product)}
                            className="block w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            style={{ minHeight: "unset" }}
                          >
                            <p className="font-medium text-sm text-foreground">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qté : {product.quantity} {product.unit}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Fab
        onClick={openCreate}
        ariaLabel="Ajouter une catégorie"
        className="md:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-emerald-600 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      />

      <CategoryModal
        open={showCategoryModal}
        category={editingCategory}
        onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
        onSaved={loadData}
      />

      <ProductModal
        open={showProductModal}
        editProduct={editingProduct}
        onClose={closeProductModal}
        onSaved={loadData}
      />
    </div>
  );
}
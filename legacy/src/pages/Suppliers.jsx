import React, { useState, useEffect, useMemo } from "react";
import { Supplier, Product } from "@/entities/all";
import SupplierModal from "@/components/suppliers/SupplierModal";
import SupplierDesktopTable from "@/components/suppliers/SupplierDesktopTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { Plus, Search, Truck, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Fab from "@/components/Fab";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const handleViewArticles = (s) => {
    sessionStorage.setItem("search_products", s.name);
    navigate("/Products");
  };

  const loadData = async () => {
    setIsLoading(true);
    const [s, p] = await Promise.all([Supplier.list("-created_date"), Product.list()]);
    setSuppliers(s);
    setProducts(p);
    setIsLoading(false);
  };

  const productCounts = useMemo(() => {
    const map = new Map();
    for (const pr of products) {
      const names = new Set();
      if (pr.suppliers && pr.suppliers.length) {
        pr.suppliers.forEach((s) => { if (s.name) names.add(s.name); });
      } else if (pr.supplier) {
        names.add(pr.supplier);
      }
      for (const n of names) map.set(n, (map.get(n) || 0) + 1);
    }
    return map;
  }, [products]);

  const filtered = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (s.name || "").toLowerCase().includes(q)
      || (s.phone || "").includes(q)
      || (s.email || "").toLowerCase().includes(q)
      || (s.contact_person || "").toLowerCase().includes(q);
  });

  const handleEdit = (s) => {
    setEditing(s);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setShowModal(true);
  };

  const handleDelete = async (s) => {
    if (!confirm(`Supprimer le fournisseur « ${s.name} » ?`)) return;
    await Supplier.delete(s.id);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background">
      {/* Desktop header */}
      <div className="hidden md:block pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground">Fournisseurs</h1>
            <p className="text-muted-foreground mt-1">{suppliers.length} fournisseur{suppliers.length > 1 ? "s" : ""}</p>
          </div>
          <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 shadow">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un fournisseur
          </Button>
        </div>
      </div>

      {/* Search + column headers */}
      <div className="sticky top-0 z-20 bg-[#F5F3F2]/95 md:bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="px-4 pt-3 md:px-0">
          <SearchInput
            placeholder="Nom, téléphone ou contact..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="px-4 md:pt-4 md:pb-8">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <p className="mt-3 text-muted-foreground text-sm">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun fournisseur trouvé</p>
          </div>
        ) : (
          <>
          <div className="flex flex-col gap-2 lg:hidden">
            {filtered.map(s => {
              const count = productCounts.get(s.name) || 0;
              return (
                <div key={s.id} onClick={() => handleViewArticles(s)} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {s.phone ? s.phone : s.email ? s.email : "—"}
                      {s.contact_person ? ` · ${s.contact_person}` : ""}
                    </p>
                  </div>
                  <span className="hidden sm:block text-xs text-muted-foreground mr-4 whitespace-nowrap">{count} article{count > 1 ? "s" : ""}</span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEdit(s)} className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(s)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <SupplierDesktopTable
            suppliers={filtered}
            productCounts={productCounts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewArticles={handleViewArticles}
          />
          </>
        )}
      </div>

      {/* Mobile FAB */}
      <Fab
        onClick={handleAdd}
        ariaLabel="Ajouter un fournisseur"
        className="md:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-emerald-600 shadow-xl flex items-center justify-center"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      />

      <SupplierModal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={loadData} editing={editing} />
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { Location, Product } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MapPin, Search } from "lucide-react";
import { hasLocation } from "@/lib/locations";
import LocationModal from "@/components/products/LocationModal";
import Fab from "@/components/Fab";

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    const [locs, prods] = await Promise.all([Location.list(), Product.list()]);
    setLocations(locs);
    setProducts(prods);
    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const countByLocation = (id) =>
    products.filter((p) => hasLocation(p, id, locations)).length;

  const filteredLocations = locations.filter((l) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (l.name || "").toLowerCase().includes(q) || (l.description || "").toLowerCase().includes(q);
  });

  const handleEdit = (loc) => { setEditing(loc); setShowModal(true); };
  const openCreate = () => { setEditing(null); setShowModal(true); };

  const handleDelete = async (loc) => {
    const count = countByLocation(loc.id);
    if (!window.confirm(`Supprimer l'emplacement « ${loc.name} »${count ? ` ? ${count} article(s) ne seront plus rattachés à cet emplacement.` : " ?"}`)) return;
    setDeletingId(loc.id);
    try {
      await Location.delete(loc.id);
      await loadData();
    } catch (err) {
      alert("Erreur : " + (err?.message || err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-2 hidden md:block">Emplacements</h1>
          </div>
          <Button onClick={openCreate} className="hidden md:inline-flex bg-emerald-600 hover:bg-emerald-700 shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un emplacement
          </Button>
        </div>

        <SearchInput
          className="mb-6 max-w-md"
          placeholder="Rechercher un emplacement..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-muted-foreground">Chargement...</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Aucun emplacement trouvé</p>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Ajouter un emplacement
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLocations.map((loc) => (
              <Card key={loc.id} className="shadow-sm border border-border/60 hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-border/60">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      {loc.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{countByLocation(loc.id)}</Badge>
                      <button onClick={() => handleEdit(loc)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Modifier">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(loc)} disabled={deletingId === loc.id} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardTitle>
                  {loc.description && <p className="text-sm text-muted-foreground">{loc.description}</p>}
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{countByLocation(loc.id)} article(s) rattaché(s)</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Fab
        onClick={openCreate}
        ariaLabel="Ajouter un emplacement"
        className="md:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-emerald-600 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      />

      <LocationModal
        open={showModal}
        location={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={loadData}
      />
    </div>
  );
}
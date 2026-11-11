import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Livreur, LivreurStock } from "@/entities/all";
import LivreurModal from "@/components/livreurs/LivreurModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { Plus, Search, Bike, Pencil, Trash2, MapPin, Phone } from "lucide-react";
import Fab from "@/components/Fab";

export default function Livreurs() {
  const navigate = useNavigate();
  const [livreurs, setLivreurs] = useState([]);
  const [stockCounts, setStockCounts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [ls, stock] = await Promise.all([Livreur.list("-created_date"), LivreurStock.list()]);
    setLivreurs(ls);
    const counts = {};
    for (const s of stock) {
      counts[s.livreur_id] = (counts[s.livreur_id] || 0) + 1;
    }
    setStockCounts(counts);
    setIsLoading(false);
  };

  const filtered = livreurs.filter((l) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (l.name || "").toLowerCase().includes(q)
      || (l.phone || "").includes(q)
      || (l.address || "").toLowerCase().includes(q)
      || (l.contact_person || "").toLowerCase().includes(q);
  });

  const handleEdit = (l) => { setEditing(l); setShowModal(true); };
  const handleAdd = () => { setEditing(null); setShowModal(true); };

  const handleDelete = async (l) => {
    if (!confirm(`Supprimer le livreur « ${l.name} » ?`)) return;
    const stock = await LivreurStock.filter({ livreur_id: l.id });
    if (stock.length) await LivreurStock.deleteMany({ livreur_id: l.id });
    await Livreur.delete(l.id);
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background">
      <div className="hidden md:block pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground">Livreurs</h1>
            <p className="text-muted-foreground mt-1">{livreurs.length} livreur{livreurs.length > 1 ? "s" : ""}</p>
          </div>
          <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 shadow">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un livreur
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-[#F5F3F2]/95 md:bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="px-4 pt-3 md:px-0">
          <SearchInput
            placeholder="Nom, téléphone, zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 md:pt-4 md:pb-8">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <p className="mt-3 text-muted-foreground text-sm">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bike className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun livreur trouvé</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-w-3xl mx-auto">
            {filtered.map((l) => {
              const count = stockCounts[l.id] || 0;
              return (
                <div key={l.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-card hover:bg-muted/50 transition-colors">
                  <button onClick={() => navigate(`/LivreurDetail?id=${l.id}`)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm truncate">{l.name}</p>
                        {l.is_relay !== false && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 whitespace-nowrap">Relais</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {l.phone ? <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{l.phone}</span> : null}
                        {l.address ? <span className="inline-flex items-center gap-1 ml-2"><MapPin className="w-3 h-3" />{l.address}</span> : null}
                      </p>
                    </div>
                  </button>
                  <span className="text-xs text-muted-foreground mr-3 whitespace-nowrap hidden sm:block">{count} produit{count > 1 ? "s" : ""}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(l)} className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(l)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Fab
        onClick={handleAdd}
        ariaLabel="Ajouter un livreur"
        className="md:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-emerald-600 shadow-xl flex items-center justify-center"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      />

      <LivreurModal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={loadData} editing={editing} />
    </div>
  );
}
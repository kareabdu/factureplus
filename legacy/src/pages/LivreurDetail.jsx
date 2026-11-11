import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Livreur, LivreurStock, Product, Location } from "@/entities/all";
import { addLivreurStockEntry, adjustProductStockForLivreur, reapprovisionnerLivreur } from "@/lib/livreurStock";
import { getTeamId } from "@/lib/team";
import { getLocationEntries } from "@/lib/locations";
import SearchableSelect from "@/components/SearchableSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Trash2, Bike, Package, PackagePlus, FilePlus } from "lucide-react";

export default function LivreurDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const livreurId = searchParams.get("id");
  const [livreur, setLivreur] = useState(null);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(null);
  const [pickedLoc, setPickedLoc] = useState(null);
  const [initQty, setInitQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);

  const loadData = async () => {
    if (!livreurId) return;
    const [l, s, p, locs] = await Promise.all([
      Livreur.filter({ id: livreurId }),
      LivreurStock.filter({ livreur_id: livreurId }),
      Product.list(),
      Location.list(),
    ]);
    setLivreur(l[0] || null);
    setStock(s);
    setProducts(p);
    setLocations(locs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [livreurId]);

  const productItems = useMemo(() => products.map((p) => ({
    value: p.id,
    label: p.name,
    sub: `Stock total: ${p.quantity ?? 0}`,
  })), [products]);

  // Emplacements disponibles pour le produit sélectionné (avec stock par emplacement).
  const pickedProduct = picked ? products.find((pr) => pr.id === picked.value) : null;
  const locItems = useMemo(() => {
    if (!pickedProduct) return [];
    return getLocationEntries(pickedProduct).map((e) => {
      const loc = locations.find((l) => l.id === e.location_id);
      return { value: e.location_id, label: loc?.name || "Emplacement", sub: `Stock: ${e.quantity ?? 0}` };
    });
  }, [pickedProduct, locations]);

  const addEntry = async () => {
    if (!picked) { alert("Choisissez un produit"); return; }
    const qty = parseFloat(initQty) || 0;
    if (qty <= 0) { alert("Quantité initiale invalide"); return; }
    setSaving(true);
    try {
      const product = products.find((pr) => pr.id === picked.value) || { id: picked.value, name: picked.label, unit: "Pcs" };
      const locId = pickedLoc?.value || null;
      const locName = pickedLoc?.label || "";
      await addLivreurStockEntry(livreurId, product, qty, locId, locName);
      setPicked(null);
      setPickedLoc(null);
      setInitQty("");
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const updateInitial = async (row, newInitial) => {
    const qty = parseFloat(newInitial) || 0;
    // Ajuste le stock courant du delta (préserve les livraisons déjà déduites)
    const delta = qty - (row.initial_quantity || 0);
    await LivreurStock.update(row.id, { initial_quantity: qty, quantity: (row.quantity || 0) + delta });
    await adjustProductStockForLivreur(row.product_id, delta, row.location_id);
    loadData();
  };

  const removeEntry = async (row) => {
    if (!confirm(`Retirer « ${row.product_name} » du stock du livreur ?`)) return;
    await adjustProductStockForLivreur(row.product_id, -(row.initial_quantity || 0), row.location_id);
    await LivreurStock.delete(row.id);
    loadData();
  };

  const reapprovisionner = async (row) => {
    const input = prompt(`Réapprovisionner « ${row.product_name} »\nQuantité à ajouter au stock du livreur :`);
    if (input === null) return;
    const qty = parseFloat(input) || 0;
    if (qty <= 0) { alert("Quantité invalide"); return; }
    setSaving(true);
    try {
      await reapprovisionnerLivreur(row, qty);
      loadData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!livreur) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">Livreur introuvable.</p>
        <Button onClick={() => navigate("/Livreurs")}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block pt-8 max-w-3xl mx-auto px-8">
        <button onClick={() => navigate("/Livreurs")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ChevronLeft className="w-4 h-4" /> Livreurs
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Bike className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-semibold text-foreground">{livreur.name}</h1>
            <p className="text-muted-foreground text-sm">
              {livreur.phone || "—"}
              {livreur.address ? ` · ${livreur.address}` : ""}
              {livreur.is_relay !== false ? " · Point de relais" : ""}
            </p>
          </div>
          <Button
            onClick={() => navigate(`/AddInvoice?type=bl&livreur_id=${livreurId}&livreur_name=${encodeURIComponent(livreur.name)}`)}
            className="bg-emerald-600 hover:bg-emerald-700 hidden md:flex"
          >
            <FilePlus className="w-4 h-4 mr-1" /> Nouveau bon
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 pb-28 md:pb-10 space-y-4">
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4 space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Confier du stock au livreur</h3>
          <div className="border border-border/60 rounded-lg px-2 py-1">
            <SearchableSelect
              value={picked?.label || ""}
              items={productItems}
              placeholder="Choisir un produit"
              onSelect={(sel) => { setPicked(sel); setPickedLoc(null); }}
              onChange={() => {}}
            />
          </div>
          {locItems.length > 0 && (
            <div className="border border-border/60 rounded-lg px-2 py-1">
              <SearchableSelect
                value={pickedLoc?.label || ""}
                items={locItems}
                placeholder="Emplacement d'origine"
                onSelect={(sel) => setPickedLoc(sel)}
                onChange={() => {}}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="1"
              value={initQty}
              onChange={(e) => setInitQty(e.target.value)}
              placeholder="Quantité initiale"
              className="flex-1"
            />
            <Button onClick={addEntry} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Confier
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">Stock du livreur</h3>
            <span className="text-xs text-muted-foreground">{stock.length} produit{stock.length > 1 ? "s" : ""}</span>
          </div>
          {stock.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun stock confié. Ajoutez un produit ci-dessus.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-muted/40 text-[11px] font-medium text-muted-foreground uppercase">
                <div className="col-span-6">Produit</div>
                <div className="col-span-2 text-right">Initial</div>
                <div className="col-span-2 text-right">Restant</div>
                <div className="col-span-2 text-right">Livré</div>
              </div>
              {stock.map((row) => {
                const delivered = (row.initial_quantity || 0) - (row.quantity || 0);
                return (
                  <div key={row.id} className="px-4 py-3">
                    {/* Carte mobile */}
                    <div className="md:hidden space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{row.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.unit || "Pcs"}{row.location_name ? ` · ${row.location_name}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => reapprovisionner(row)} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50" style={{ minHeight: "unset", minWidth: "unset" }} title="Réapprovisionner">
                            <PackagePlus className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeEntry(row)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50" style={{ minHeight: "unset", minWidth: "unset" }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Initial</p>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={row.initial_quantity || 0}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              if (v !== (row.initial_quantity || 0)) updateInitial(row, v);
                            }}
                            className="w-full text-sm font-semibold bg-transparent outline-none p-0"
                            style={{ minHeight: "unset", minWidth: "unset" }}
                          />
                        </div>
                        <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Restant</p>
                          <p className={`text-sm font-semibold ${row.quantity < 0 ? "text-red-600" : "text-foreground"}`}>{row.quantity ?? 0}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Livré</p>
                          <p className="text-sm font-medium text-foreground">{delivered > 0 ? delivered : 0}</p>
                        </div>
                      </div>
                    </div>
                    {/* Ligne desktop */}
                    <div className="hidden md:grid md:grid-cols-12 md:gap-2 md:items-center">
                      <div className="md:col-span-6 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{row.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.unit || "Pcs"}{row.location_name ? ` · ${row.location_name}` : ""}
                        </p>
                      </div>
                      <div className="md:col-span-2 flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={row.initial_quantity || 0}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            if (v !== (row.initial_quantity || 0)) updateInitial(row, v);
                          }}
                          className="w-24 text-right text-sm rounded-md border border-border/60 px-2 py-1 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-2 flex items-center justify-end gap-2">
                        <span className={`text-sm font-semibold ${row.quantity < 0 ? "text-red-600" : "text-foreground"}`}>{row.quantity ?? 0}</span>
                      </div>
                      <div className="md:col-span-1 flex items-center justify-end gap-2">
                        <span className="text-sm text-muted-foreground">{delivered > 0 ? delivered : 0}</span>
                      </div>
                      <div className="md:col-span-1 flex items-center justify-end gap-1">
                        <button onClick={() => reapprovisionner(row)} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50" title="Réapprovisionner">
                          <PackagePlus className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeEntry(row)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="fixed left-0 right-0 md:hidden z-30 px-4 pt-3 pb-3 bg-gradient-to-t from-background via-background to-transparent" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <Button
          onClick={() => navigate(`/AddInvoice?type=bl&livreur_id=${livreurId}&livreur_name=${encodeURIComponent(livreur.name)}`)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg"
        >
          <FilePlus className="w-4 h-4 mr-1" /> Créer un bon de livraison
        </Button>
      </div>
    </div>
  );
}
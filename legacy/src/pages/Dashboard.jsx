import React, { useState, useEffect } from "react";
import { Product, Category, StockMovement } from "@/entities/all";
import { getTeamSettings } from "@/lib/teamSettings";
import { Package, AlertCircle, Wallet, Layers, RefreshCw } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

import StatsCard from "../components/dashboard/StatsCard";
import RecentMovements from "../components/dashboard/RecentMovements";
import CategoryChart from "../components/dashboard/CategoryChart";
import SalesDashboard from "../components/dashboard/SalesDashboard";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [activeTab, setActiveTab] = useState("ventes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadData(mounted);
    return () => { mounted = false; };
  }, []);

  const loadData = async (mounted) => {
    setLoading(true);
    setError(false);
    try {
      const [productsData, categoriesData, movementsData] = await Promise.all([
        Product.list(),
        Category.list(),
        StockMovement.list('-created_date', 50),
      ]);
      if (!mounted) return;
      setProducts(productsData);
      setCategories(categoriesData);
      setMovements(movementsData);
      const s = await getTeamSettings();
      if (!mounted) return;
      if (s) setCurrencySymbol(s.currency_symbol || "");
    } catch (e) {
      if (mounted) setError(true);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + (p.quantity * (p.unit_price || 0)), 0);
  const lowStockCount = products.filter(p => p.quantity <= p.reorder_level).length;
  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto lg:max-w-none">
        <div className="mb-5 hidden md:block">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble de votre activité</p>
        </div>

        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
            <p className="text-muted-foreground mb-4">Impossible de charger le tableau de bord.</p>
            <button
              onClick={() => loadData(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium active:scale-95 transition"
            >
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        )}

        {!loading && !error && (
          <>
        {/* Toggle Vente / Stock */}
        <div className="inline-flex p-1.5 bg-muted rounded-full mb-5">
          <button
            onClick={() => setActiveTab("ventes")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === "ventes" ? "bg-white text-black shadow-md" : "text-gray-500"}`}
          >
            Vente
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === "stock" ? "bg-white text-black shadow-md" : "text-gray-500"}`}
          >
            Stock
          </button>
        </div>

        {activeTab === "ventes" && <SalesDashboard />}

        {activeTab === "stock" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatsCard title="Total produits" value={totalProducts} icon={Package} color="#45A069" bg="#E6F4EE" />
              <StatsCard title="Valeur du stock" value={formatAmount(totalStockValue, currencySymbol)} icon={Wallet} color="#3A64D4" bg="#E8EDFB" />
              <StatsCard title="Stock bas" value={lowStockCount} icon={AlertCircle} color="#F07E2F" bg="#FDEEE2" />
              <StatsCard title="Total stock" value={totalItems} icon={Layers} color="#8C3FA7" bg="#F3EAF7" />
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
              <CategoryChart products={products} categories={categories} currencySymbol={currencySymbol} />
              <RecentMovements movements={movements} />
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
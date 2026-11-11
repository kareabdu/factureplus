import React, { useState, useEffect } from "react";
import { Product, Category, StockMovement } from "@/entities/all";
import { getTeamSettings } from "@/lib/teamSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, DollarSign, AlertCircle } from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

import StatsCard from "../components/dashboard/StatsCard";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#14b8a6'];

export default function Analytics() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [productsData, categoriesData, movementsData] = await Promise.all([
      Product.list(),
      Category.list(),
      StockMovement.list('-created_date', 100),
    ]);
    setProducts(productsData);
    setCategories(categoriesData);
    setMovements(movementsData);
    const s = await getTeamSettings();
    if (s) setCurrencySymbol(s.currency_symbol || "");
    setIsLoading(false);
  };

  const categoryData = categories.map((category, index) => {
    const categoryProducts = products.filter(p => p.category_id === category.id);
    const totalValue = categoryProducts.reduce((sum, p) => sum + (p.quantity * (p.unit_price || 0)), 0);
    const totalQuantity = categoryProducts.reduce((sum, p) => sum + p.quantity, 0);
    
    return {
      name: category.name,
      value: totalValue,
      quantity: totalQuantity,
      products: categoryProducts.length,
      color: COLORS[index % COLORS.length]
    };
  }).filter(d => d.value > 0);

  const topProducts = [...products]
    .sort((a, b) => (b.quantity * (b.unit_price || 0)) - (a.quantity * (a.unit_price || 0)))
    .slice(0, 10)
    .map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
      value: p.quantity * (p.unit_price || 0),
      quantity: p.quantity
    }));

  const lowStockProducts = products.filter(p => p.quantity <= p.reorder_level);

  const totalValue = products.reduce((sum, p) => sum + (p.quantity * (p.unit_price || 0)), 0);
  const totalCost = products.reduce((sum, p) => sum + (p.quantity * (p.cost_price || 0)), 0);
  const potentialProfit = totalValue - totalCost;

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 hidden md:block">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-2">Analytiques</h1>
          <p className="text-muted-foreground">Analyse détaillée de vos performances</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Stock Value"
            value={formatAmount(totalValue, currencySymbol)}
            subtitle="Selling price value"
            icon={DollarSign}
            color="#45A069"
            bg="#E6F4EE"
          />
          <StatsCard
            title="Total Cost"
            value={formatAmount(totalCost, currencySymbol)}
            subtitle="Purchase cost value"
            icon={Package}
            color="#3A64D4"
            bg="#E8EDFB"
          />
          <StatsCard
            title="Potential Profit"
            value={formatAmount(potentialProfit, currencySymbol)}
            subtitle={`${((potentialProfit / totalCost) * 100).toFixed(1)}% margin`}
            icon={TrendingUp}
            color="#8C3FA7"
            bg="#F3EAF7"
          />
          <StatsCard
            title="Low Stock Items"
            value={lowStockProducts.length}
            subtitle={`${((lowStockProducts.length / products.length) * 100).toFixed(1)}% of inventory`}
            icon={AlertCircle}
            color="#F07E2F"
            bg="#FDEEE2"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-sm border border-border/60">
            <CardHeader className="border-b border-border/60">
              <CardTitle>Top 10 Products by Value</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {topProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value) => [formatAmount(value, currencySymbol), 'Value']}
                    />
                    <Bar dataKey="value" fill="#059669" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-border/60">
            <CardHeader className="border-b border-border/60">
              <CardTitle>Stock Distribution by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {categoryData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value) => formatAmount(value, currencySymbol)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border border-border/60">
          <CardHeader className="border-b">
            <CardTitle>Category Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryData.map((category) => (
                <div key={category.name} className="p-4 rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <div 
                      className="w-8 h-8 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Products:</span>
                      <span className="font-medium">{category.products}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Quantity:</span>
                      <span className="font-medium">{category.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="font-medium text-emerald-600">{formatAmount(category.value, currencySymbol)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
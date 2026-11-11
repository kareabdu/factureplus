import React, { useState, useEffect } from "react";
import { Invoice, InvoiceItem, Product } from "@/entities/all";
import { getTeamSettings } from "@/lib/teamSettings";
import { formatAmount } from "@/lib/formatAmount";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Input } from "@/components/ui/input";
import { CreditCard, Clock, TrendingUp, ShoppingCart, Trophy, Coins } from "lucide-react";

const PERIODS = [
  { label: "Tout", days: -1 },
  { label: "Aujourd'hui", days: 0 },
  { label: "7j", days: 7 },
  { label: "30j", days: 30 },
  { label: "Période", days: null },
];

export default function SalesDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState("CFA");
  const [period, setPeriod] = useState(-1);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [selectedBar, setSelectedBar] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [invoicesData, itemsData, productsData] = await Promise.all([
      Invoice.list("-date", 500),
      InvoiceItem.list("-created_date", 1000),
      Product.list(),
    ]);
    setInvoices(invoicesData);
    setItems(itemsData);
    setProducts(productsData);
    const s = await getTeamSettings();
    if (s) setCurrencySymbol(s.currency_symbol || "CFA");
  };

  const getDateRange = () => {
    const end = isCustom && customEnd ? new Date(customEnd) : new Date();
    end.setHours(23, 59, 59, 0);
    let start;
    if (isCustom && customStart) {
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date();
      if (period === -1) {
        start.setFullYear(2000, 0, 1);
      } else {
        start.setDate(start.getDate() - period);
      }
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  };

  const { start, end } = getDateRange();

  const filteredInvoices = invoices.filter(inv => {
    if (!inv.date) return false;
    if (inv.type === "proforma" || inv.type === "bl") return false;
    const d = new Date(inv.date);
    return d >= start && d <= end && inv.status !== "cancelled" && inv.status !== "refused";
  });

  const paidInvoices = filteredInvoices.filter(i => i.status === "paid");
  const totalRevenue = filteredInvoices.reduce((s, i) => {
    if (i.status === "paid") return s + (i.total_amount || 0);
    const received = (i.payments || []).reduce((a, p) => a + (p.amount || 0), 0);
    return s + received;
  }, 0);
  const totalDue = filteredInvoices.reduce((s, i) => s + (i.balance_due || 0), 0);
  const invoiceCount = filteredInvoices.length;

  const paidIds = new Set(paidInvoices.map(i => i.id));
  const soldItems = items.filter(it => paidIds.has(it.invoice_id));
  const totalQtySold = soldItems.reduce((s, it) => s + (it.quantity || 0), 0);

  const costMap = {};
  products.forEach((p) => { costMap[p.id] = p.cost_price || 0; });
  const totalCost = soldItems.reduce((s, it) => s + (it.quantity || 0) * (costMap[it.product_id] || 0), 0);
  const paidRevenue = paidInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const profit = paidRevenue - totalCost;
  const marginPct = paidRevenue > 0 ? Math.round((profit / paidRevenue) * 100) : 0;

  const productTotals = {};
  soldItems.forEach(it => {
    const name = it.product_name || "Inconnu";
    if (!productTotals[name]) productTotals[name] = { qty: 0, revenue: 0 };
    productTotals[name].qty += it.quantity || 0;
    productTotals[name].revenue += it.total_price || 0;
  });
  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([name, v]) => ({ name, ...v }));

  const buildChartData = () => {
    const map = {};
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const useWeek = diffDays > 31;

    filteredInvoices.forEach(inv => {
      const d = new Date(inv.date);
      let key, sortKey;
      if (useWeek) {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
        sortKey = weekStart.getTime();
      } else {
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        key = dayStart.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
        sortKey = dayStart.getTime();
      }
      if (!map[key]) map[key] = { label: key, sortKey, total: 0, count: 0 };
      map[key].total += inv.total_amount || 0;
      map[key].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-20);
  };

  const chartData = buildChartData();

  const kpiCards = [
    { label: "Chiffre d'affaires", value: formatAmount(totalRevenue, currencySymbol), icon: CreditCard, color: "#45A069", bg: "#E6F4EE" },
    { label: "En attente", value: formatAmount(totalDue, currencySymbol), icon: Clock, color: "#F07E2F", bg: "#FDEEE2" },
    { label: "Factures", value: invoiceCount, icon: TrendingUp, color: "#3A64D4", bg: "#E8EDFB" },
    { label: "Articles vendus", value: totalQtySold, icon: ShoppingCart, color: "#8C3FA7", bg: "#F3EAF7" },
  ];

  return (
    <div className="space-y-5">
      {/* Period filters */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 w-fit max-w-full overflow-x-auto no-scrollbar">
        {PERIODS.map(p => {
          const active = (!isCustom && period === p.days) || (isCustom && p.days === null);
          return (
            <button
              key={p.label}
              onClick={() => { if (p.days === null) setIsCustom(true); else { setIsCustom(false); setPeriod(p.days); } }}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${active ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {isCustom && (
        <div className="flex gap-2 items-center">
          <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-36 h-9 text-sm" />
          <span className="text-muted-foreground text-sm">→</span>
          <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-36 h-9 text-sm" />
        </div>
      )}

      {/* Marge brute */}
      <div className="rounded-2xl p-5 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-900/20">
        <div className="flex items-end gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 self-center">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 h-5">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white">Bénéfice Nette</p>
              <span className="text-[10px] font-bold bg-white/25 text-emerald-900 px-2 py-0.5 rounded-full">BN</span>
            </div>
            <p className="text-base sm:text-2xl font-bold leading-tight tracking-tight break-words">{formatAmount(profit, currencySymbol)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] sm:text-xs text-white/80 mb-1 h-5">Taux de marge</p>
            <p className="text-lg sm:text-2xl font-bold leading-tight">{marginPct}%</p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.bg }}>
              <c.icon className="w-5 h-5" style={{ color: c.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="font-bold text-foreground text-[11px] sm:text-sm leading-tight break-words">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Top products : 2 colonnes sur desktop */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-base font-bold text-foreground mb-4">Ventes par période</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="40%" barGap={4}>
                <CartesianGrid vertical={false} stroke="#E8E8E8" strokeDasharray="0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#E8E8E8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#C8C8C8" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  formatter={(v) => formatAmount(v, currencySymbol)}
                />
                <Bar dataKey="total" radius={[3, 3, 0, 0]} barSize={10} onClick={(_, idx) => setSelectedBar(idx)}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={selectedBar === idx ? "#275672" : "#4A90E2"} style={{ cursor: "pointer" }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {topProducts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-foreground">Top 5 produits vendus</h2>
            </div>
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.qty} vendus · {formatAmount(p.revenue, currencySymbol)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
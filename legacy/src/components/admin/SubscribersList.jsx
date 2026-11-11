import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { Crown, Clock, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { downloadCsv } from "@/lib/exportCsv";

const tabs = [
  { key: "all", label: "Tous" },
  { key: "semestriel", label: "Semestriel" },
  { key: "monthly", label: "Mensuel" },
  { key: "annual", label: "Annuel" },
];

const planLabel = (p) => ({ semestriel: "Semestriel", monthly: "Mensuel", annual: "Annuel" })[p] || p;

const planBadgeClass = (p) => ({
  semestriel: "bg-orange-100 text-orange-800 border-orange-200",
  monthly: "bg-blue-100 text-blue-800 border-blue-200",
  annual: "bg-purple-100 text-purple-800 border-purple-200",
})[p] || "bg-muted text-foreground border-border/60";

export default function SubscribersList({ users }) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const active = users.filter(u => u.subscription_status === "active" && u.role !== "admin");
  const byTab = tab === "all" ? active : active.filter(u => u.subscription_plan === tab);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? byTab.filter(u => (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q))
    : byTab;

  const count = (key) => key === "all" ? active.length : active.filter(u => u.subscription_plan === key).length;

  const handleExport = () => {
    const headers = ["Nom", "Email", "Plan", "Date fin abonnement", "Date inscription", "ID"];
    const rows = filtered.map((u) => [
      u.full_name,
      u.email,
      planLabel(u.subscription_plan),
      u.subscription_end_date,
      u.created_date,
      u.id,
    ]);
    downloadCsv("abonnes_actifs", headers, rows);
  };

  return (
    <Card className="shadow-sm border border-border/60 mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <CardTitle className="text-base text-muted-foreground">Abonnés actifs</CardTitle>
          <span className="text-xs text-muted-foreground">({active.length})</span>
        </div>
        <div className="flex gap-2 mt-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-0 h-auto ${
                tab === t.key ? "bg-green-600 text-white border-green-600" : "bg-card text-muted-foreground border-border/60"
              }`}
              style={{ minHeight: "unset" }}
            >
              {t.label} <span className={tab === t.key ? "text-white/70" : "text-muted-foreground"}>{count(t.key)}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <SearchInput
            className="flex-1"
            placeholder="Rechercher un abonné..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            desktopClassName="md:bg-card md:border md:rounded-md"
          />
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-card hover:bg-muted transition-colors disabled:opacity-60"
            style={{ minHeight: "unset" }}
          >
            <Download className="w-3.5 h-3.5 text-green-600" /> Exporter
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {filtered.map(u => (
            <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {(u.full_name?.charAt(0) || u.email?.charAt(0) || "?").toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground break-all">{u.email}</p>
              </div>
              {u.subscription_end_date && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {format(new Date(u.subscription_end_date), "dd/MM/yyyy")}
                </span>
              )}
              <Badge className={`border ${planBadgeClass(u.subscription_plan)}`}>
                {planLabel(u.subscription_plan)}
              </Badge>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">Aucun abonné</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
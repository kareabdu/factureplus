import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Loader2, X, Search } from "lucide-react";
import { addDays, addMonths, addYears, format } from "date-fns";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";

const tabs = [
  { key: "all", label: "Toutes" },
  { key: "weekly", label: "Semestre" },
  { key: "monthly", label: "Mensuel" },
  { key: "annual", label: "Annuel" },
];

const planLabel = (p) => ({ weekly: "Semestre", monthly: "Mensuel", annual: "Annuel" })[p] || p;

export default function SubscriptionRequests({ users, onActivated }) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [activating, setActivating] = useState({});
  const [cancelling, setCancelling] = useState({});

  const pending = users.filter(u => u.subscription_status === "pending" && u.role !== "admin");
  const byTab = tab === "all" ? pending : pending.filter(u => u.subscription_plan === tab);
  const s = search.toLowerCase();
  const filtered = s
    ? byTab.filter(u => (u.full_name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s))
    : byTab;

  const handleActivate = async (u) => {
    setActivating(prev => ({ ...prev, [u.id]: true }));
    try {
      const now = new Date();
      const endDate = u.subscription_plan === "annual" ? addYears(now, 1)
        : u.subscription_plan === "weekly" ? addDays(now, 7)
        : addMonths(now, 1);
      await base44.entities.User.update(u.id, {
        subscription_status: "active",
        subscription_end_date: endDate.toISOString(),
      });
      onActivated();
    } catch (e) {
      alert("Erreur lors de l'activation : " + e.message);
    }
    setActivating(prev => ({ ...prev, [u.id]: false }));
  };

  const handleCancel = async (u) => {
    if (!confirm("Annuler la demande d'abonnement de " + (u.full_name || u.email) + " ?")) return;
    setCancelling(prev => ({ ...prev, [u.id]: true }));
    try {
      await base44.entities.User.update(u.id, {
        subscription_status: null,
        subscription_plan: null,
        subscription_end_date: null,
      });
      onActivated();
    } catch (e) {
      alert("Erreur lors de l'annulation : " + e.message);
    }
    setCancelling(prev => ({ ...prev, [u.id]: false }));
  };

  return (
    <Card className="shadow-sm border border-border/60 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-muted-foreground">Demandes d'abonnement</CardTitle>
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
              {t.label}
            </button>
          ))}
        </div>
        <SearchInput
          className="mt-3"
          placeholder="Rechercher une demande..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          desktopClassName="md:bg-card md:border md:rounded-md"
        />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {filtered.map(u => (
            <div key={u.id} className="px-4 py-3.5 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm break-all">{u.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground break-all">{u.email}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 border flex-shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  {planLabel(u.subscription_plan)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleActivate(u)}
                  disabled={activating[u.id]}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  style={{ minHeight: "unset" }}
                >
                  {activating[u.id] ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Activation...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-1.5" /> Activer</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancel(u)}
                  disabled={cancelling[u.id]}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  style={{ minHeight: "unset" }}
                >
                  {cancelling[u.id] ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /></>
                  ) : (
                    <><X className="w-4 h-4 mr-1.5" /> Annuler</>
                  )}
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">Aucune demande en attente</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
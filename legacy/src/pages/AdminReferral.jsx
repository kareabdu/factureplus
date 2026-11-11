import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Gift, Wallet, Clock, CheckCircle2, Search, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { formatAmount } from "@/lib/formatAmount";

export default function AdminReferral() {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [markingId, setMarkingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [me, list] = await Promise.all([
        base44.auth.me(),
        base44.entities.Referral.list("-created_date", 500),
      ]);
      setUser(me);
      setReferrals(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (r) => {
    setMarkingId(r.id);
    try {
      const updated = await base44.entities.Referral.update(r.id, {
        payment_status: "paid",
        paid_date: new Date().toISOString().split("T")[0],
      });
      setReferrals((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...updated } : x)));
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingId(null);
    }
  };

  const totalCommission = referrals.reduce((s, r) => s + (r.commission_amount || 0), 0);
  const totalPaid = referrals.filter((r) => r.payment_status === "paid").reduce((s, r) => s + (r.commission_amount || 0), 0);
  const totalPending = totalCommission - totalPaid;
  const referrerCount = new Set(referrals.map((r) => r.referrer_id)).size;

  const filtered = referrals.filter((r) => {
    if (filter === "pending" && r.payment_status === "paid") return false;
    if (filter === "paid" && r.payment_status !== "paid") return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.referrer_email || "").toLowerCase().includes(s) ||
      (r.referred_email || "").toLowerCase().includes(s) ||
      (r.referral_code || "").toLowerCase().includes(s)
    );
  });

  if (!loading && user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-32 space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">Parrainage — Administration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez toutes les commissions de parrainage et marquez les versements manuels.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Parrains" value={String(referrerCount)} color="bg-green-50 text-green-600" />
        <StatCard icon={Gift} label="Total filleuls" value={String(referrals.length)} color="bg-purple-50 text-purple-600" />
        <StatCard icon={Wallet} label="Commissions dues" value={formatAmount(totalCommission, "CFA")} color="bg-muted text-foreground" />
        <StatCard icon={Clock} label="En attente" value={formatAmount(totalPending, "CFA")} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-3 text-center">
          <p className="text-sm font-bold text-green-600">{formatAmount(totalPaid, "CFA")}</p>
          <p className="text-[11px] text-muted-foreground">Versé</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-3 text-center">
          <p className="text-sm font-bold text-amber-600">{formatAmount(totalPending, "CFA")}</p>
          <p className="text-[11px] text-muted-foreground">Reste à verser</p>
        </div>
      </div>

      {/* Filtres + recherche */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          className="flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (parrain, filleul, code)…"
          desktopClassName="md:bg-transparent md:border md:rounded-md"
        />
        <div className="flex gap-2">
          {[
            { key: "all", label: "Tous" },
            { key: "pending", label: "En attente" },
            { key: "paid", label: "Payés" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 sm:flex-none h-10 px-4 rounded-xl text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-green-600 text-white"
                  : "bg-card border border-border/60 text-muted-foreground hover:bg-muted"
              }`}
              style={{ minHeight: "unset", minWidth: "unset" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-8 text-center">
          <Gift className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun parrainage à afficher.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
          {/* En-tête desktop */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4">Parrain</div>
            <div className="col-span-4">Filleul</div>
            <div className="col-span-2">Plan / Date</div>
            <div className="col-span-2 text-right">Montant / Statut</div>
          </div>
          <div className="divide-y divide-border/60">
            {filtered.map((r) => {
              const paid = r.payment_status === "paid";
              return (
                <div key={r.id} className="md:grid md:grid-cols-12 md:gap-2 px-4 py-3 items-center">
                  <div className="col-span-4 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.referrer_email || "Parrain"}</p>
                    <p className="text-[11px] text-muted-foreground truncate md:hidden">{r.referred_email || "Filleul"}</p>
                  </div>
                  <div className="col-span-4 min-w-0 hidden md:block">
                    <p className="text-sm text-foreground truncate">{r.referred_email || "Filleul"}</p>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    <p>{r.plan || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.commissioned_date || ""}</p>
                  </div>
                  <div className="col-span-2 text-right mt-2 md:mt-0">
                    <p className="text-sm font-semibold text-foreground">{formatAmount(r.commission_amount, "CFA")}</p>
                    {paid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full mt-1">
                        <CheckCircle2 className="w-3 h-3" /> Payé{r.paid_date ? ` · ${r.paid_date}` : ""}
                      </span>
                    ) : (
                      <div className="flex md:flex-col items-center md:items-end gap-1 mt-1 justify-end">
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          En attente
                        </span>
                        <button
                          onClick={() => markAsPaid(r)}
                          disabled={markingId === r.id}
                          className="text-[11px] font-semibold text-green-600 hover:text-green-700 disabled:opacity-50"
                          style={{ minHeight: "unset", minWidth: "unset" }}
                        >
                          {markingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Marquer payé"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
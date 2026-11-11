import React, { useState, useEffect, useMemo } from "react";
import { ActivityLog, StockMovement } from "@/entities/all";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileText, ReceiptText, Package, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  Send, CreditCard, Trash2, Copy, CheckCircle, XCircle, Plus, Upload, History, Lock,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isActivityEnabled } from "@/lib/planLimits";
import { Link } from "react-router-dom";

const TABS = [
  { key: "all", label: "Tout" },
  { key: "docs", label: "Factures & devis" },
  { key: "stock", label: "Articles & stock" },
];

const ACTION_ICON = {
  create: Plus,
  sent: Send,
  payment: CreditCard,
  delete: Trash2,
  duplicate: Copy,
  accept: CheckCircle,
  refuse: XCircle,
  import: Upload,
  update: History,
};

function docIcon(type) {
  return type === "proforma" ? ReceiptText : FileText;
}

function Entry({ icon: Icon, color, title, subtitle, author, date }) {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-border/60">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {author} · {format(new Date(date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
        </p>
      </div>
    </div>
  );
}

export default function ActivityPanel() {
  const [logs, setLogs] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      let user;
      try {
        user = await base44.auth.me();
        setMe(user);
      } catch {}
      if (user && !isActivityEnabled(user)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [l, m] = await Promise.all([
          ActivityLog.list("-created_date", 200),
          StockMovement.list("-created_date", 100),
        ]);
        setLogs(Array.isArray(l) ? l : []);
        setMovements(Array.isArray(m) ? m : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const entries = useMemo(() => {
    const docTypes = ["invoice", "proforma"];
    // Déduplication des ActivityLog : même entité + même action -> on garde
    // uniquement l'entrée la plus récente.
    const seenLogs = new Map();
    for (const l of logs) {
      const key = `${l.entity_type}#${l.entity_id || ""}#${l.action_type}`;
      const ex = seenLogs.get(key);
      if (!ex || new Date(l.created_date) > new Date(ex.created_date)) seenLogs.set(key, l);
    }
    const built = Array.from(seenLogs.values()).map((l) => {
      const Icon = l.entity_type === "stock" ? RefreshCw
        : l.entity_type === "product" ? Package
        : docIcon(l.entity_type);
      const color = l.action_type === "delete" || l.action_type === "refuse"
        ? "bg-red-50 text-red-600"
        : l.action_type === "payment" || l.action_type === "accept"
        ? "bg-green-50 text-green-600"
        : l.action_type === "sent" || l.action_type === "create"
        ? "bg-blue-50 text-blue-600"
        : "bg-muted text-muted-foreground";
      return {
        id: l.id, date: l.created_date, tab: docTypes.includes(l.entity_type) ? "docs" : "stock",
        Icon, color, title: l.description || l.action_type,
        subtitle: l.metadata?.number ? `N° ${l.metadata.number}` : "", author: l.user_name || l.created_by || "—",
      };
    });
    // Déduplication des StockMovement : regroupe par référence + type de mouvement.
    // Une facture avec 3 articles -> 1 seule entrée "Sortie stock" avec le total.
    const seenMv = new Map();
    for (const m of movements) {
      // Les ajustements (saisie manuelle) restent individuels : on ne les regroupe pas.
      const key = m.movement_type === "adjustment" ? `adj#${m.id}` : `${m.reference || ""}#${m.movement_type}`;
      if (!seenMv.has(key)) {
        seenMv.set(key, { ...m, _count: 1, _productNames: new Set([m.product_name]) });
      } else {
        const e = seenMv.get(key);
        e.quantity += m.quantity || 0;
        e._count += 1;
        e._productNames.add(m.product_name);
        if (new Date(m.created_date) > new Date(e.created_date)) e.created_date = m.created_date;
      }
    }
    const mv = Array.from(seenMv.values()).map((m) => {
      const Icon = m.movement_type === "in" ? ArrowUpCircle : m.movement_type === "out" ? ArrowDownCircle : RefreshCw;
      const color = m.movement_type === "in" ? "bg-green-50 text-green-600" : m.movement_type === "out" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600";
      const sign = m.movement_type === "in" ? "+" : m.movement_type === "out" ? "-" : "";
      const label = m.movement_type === "adjustment"
        ? `${Array.from(m._productNames)[0] || "—"} — ${m.previous_quantity ?? 0} → ${m.new_quantity ?? m.quantity}`
        : m._productNames.size > 1
          ? `${m._productNames.size} articles — ${sign}${m.quantity}`
          : `${Array.from(m._productNames)[0] || "—"} — ${sign}${m.quantity}`;
      return {
        id: m.id, date: m.created_date, tab: "stock",
        Icon, color, title: label,
        subtitle: m.reference || m.reason || "", author: m.user_name || "—",
      };
    });
    let all = [...built, ...mv];
    if (tab === "docs") all = all.filter((e) => e.tab === "docs");
    if (tab === "stock") all = all.filter((e) => e.tab === "stock");
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [logs, movements, tab]);

  if (me && !isActivityEnabled(me)) {
    return (
      <div className="bg-card rounded-2xl border border-border/60 p-6 text-center">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <h2 className="font-heading text-xl font-semibold text-foreground">Suivi des activités indisponible</h2>
        <p className="text-sm text-muted-foreground mt-2">Le suivi des activités n'est pas inclus dans votre plan Essentiel.</p>
        <Link to="/Subscription" className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">Voir les plans</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-muted rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Aucune activité</div>
        ) : (
          entries.map((e) => <Entry key={e.id} icon={e.Icon} color={e.color} title={e.title} subtitle={e.subtitle} author={e.author} date={e.date} />)
        )}
      </div>
    </div>
  );
}
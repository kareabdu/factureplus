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
    <div className="flex items-start gap-3 p-4 border-b border-gray-100">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        <p className="text-[11px] text-gray-400 mt-0.5">
          {author} · {format(new Date(date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
        </p>
      </div>
    </div>
  );
}

export default function Activity() {
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
    const built = logs.map((l) => {
      const Icon = l.entity_type === "stock" ? RefreshCw
        : l.entity_type === "product" ? Package
        : docIcon(l.entity_type);
      const color = l.action_type === "delete" || l.action_type === "refuse"
        ? "bg-red-50 text-red-600"
        : l.action_type === "payment" || l.action_type === "accept"
        ? "bg-green-50 text-green-600"
        : l.action_type === "sent" || l.action_type === "create"
        ? "bg-blue-50 text-blue-600"
        : "bg-gray-100 text-gray-600";
      return {
        id: l.id, date: l.created_date, tab: docTypes.includes(l.entity_type) ? "docs" : "stock",
        Icon, color, title: l.description || l.action_type,
        subtitle: l.metadata?.number ? `N° ${l.metadata.number}` : "", author: l.user_name || l.created_by || "—",
      };
    });
    const mv = movements.map((m) => {
      const Icon = m.movement_type === "in" ? ArrowUpCircle : m.movement_type === "out" ? ArrowDownCircle : RefreshCw;
      const color = m.movement_type === "in" ? "bg-green-50 text-green-600" : m.movement_type === "out" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600";
      const sign = m.movement_type === "in" ? "+" : m.movement_type === "out" ? "-" : "";
      return {
        id: m.id, date: m.created_date, tab: "stock",
        Icon, color,
        title: `${m.product_name} — ${sign}${m.quantity}`,
        subtitle: m.reason || "", author: m.user_name || "—",
      };
    });
    let all = [...built, ...mv];
    if (tab === "docs") all = all.filter((e) => e.tab === "docs");
    if (tab === "stock") all = all.filter((e) => e.tab === "stock");
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [logs, movements, tab]);

  if (me && !isActivityEnabled(me)) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <Lock className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Suivi des activités indisponible</h1>
          <p className="text-sm text-gray-500 mt-2">Le suivi des activités n'est pas inclus dans votre plan Essentiel.</p>
          <Link to="/Subscription" className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">Voir les plans</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold text-gray-900">Activité</h1>
        <p className="text-gray-600 mt-1">Journal des actions de l'équipe</p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucune activité</div>
        ) : (
          entries.map((e) => <Entry key={e.id} icon={e.Icon} color={e.color} title={e.title} subtitle={e.subtitle} author={e.author} date={e.date} />)
        )}
      </div>
    </div>
  );
}
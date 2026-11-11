import React, { useState, useEffect } from "react";
import { Bell, Diamond, CheckCircle2, AlertTriangle, XCircle, Gift, Crown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useStockAlerts } from "@/hooks/useStockAlerts";
import { StockAlert } from "@/entities/all";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

const fmtRelative = (date) => {
  if (!date) return "";
  try {
    return formatDistanceToNowStrict(new Date(date), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
};

/**
 * Cloche de notifications — style Base44.
 * tone="onGreen"  → sur fond vert (header mobile)
 * tone="onLight"  → sur fond clair (sidebar desktop)
 *
 * Popover à deux onglets (Notifications / Dernières nouvelles), lignes avec
 * titre + corps + bouton "Améliorer" + horodatage à point bleu, pied
 * "Tout marquer comme lu".
 */
export default function StockAlertsBell({ tone = "onGreen", compact = false }) {
  const { outOfStock, lowStock, total, loading, refresh } = useStockAlerts();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("notifications");
  const [, setTick] = useState(0);

  // Force le re-rendrement toutes les 30s pour que l'horodatage relatif
  // ("il y a X min") continue de s'incrémenter tant que le popover est ouvert.
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [open]);

  const onGreen = tone === "onGreen";
  const iconColor = onGreen ? "text-white" : "text-muted-foreground";
  const sizeCls = "h-8 w-8";
  const iconCls = compact ? "w-5 h-5" : "w-5 h-5";

  const markAllRead = async () => {
    const all = [...outOfStock, ...lowStock];
    if (all.length === 0) return;
    try {
      await StockAlert.bulkUpdate(all.map((a) => ({ id: a.id, notified: true })));
      refresh();
    } catch {}
  };

  const markAsRead = async (id) => {
    try {
      await StockAlert.update(id, { notified: true });
      refresh();
    } catch {}
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`relative ${sizeCls} flex items-end justify-center flex-shrink-0`}
          style={{ minHeight: "unset", minWidth: "unset" }}
          aria-label="Notifications"
        >
          <span className="relative h-8 w-8 flex items-center justify-center pointer-events-none">
            <Bell className={`${iconCls} ${iconColor}`} />
            {total > 0 && (
              <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
                {total > 9 ? "9+" : total}
              </span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[70vh] overflow-hidden flex flex-col shadow-lg border border-gray-200 rounded-2xl bg-white">
        {/* Onglets */}
        <div className="flex items-center gap-1 px-2 pt-2 bg-white">
          <TabButton active={tab === "notifications"} onClick={() => setTab("notifications")}>
            Notifications
          </TabButton>
          <TabButton active={tab === "news"} onClick={() => setTab("news")}>
            Dernières nouvelles
          </TabButton>
        </div>

        <div className="overflow-y-auto flex-1 bg-white">
          {tab === "notifications" ? (
            loading ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-600 rounded-full animate-spin mb-2" />
                <p className="text-xs text-muted-foreground">Chargement…</p>
              </div>
            ) : total === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-foreground">Aucune notification</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Tous vos stocks sont au-dessus du seuil de réapprovisionnement.
                </p>
              </div>
            ) : (
              <>
                {outOfStock.map((a) => (
                  <NotifRow
                    key={a.id}
                    icon={<XCircle className="w-4 h-4 text-red-500" />}
                    iconBg="bg-red-50"
                    title={a.product_name}
                    body="Rupture de stock — réapprovisionnez dès maintenant."
                    date={a.updated_date || a.created_date}
                    read={!!a.notified}
                    actionLabel="Voir"
                    actionTo={createPageUrl("Products")}
                    onAction={() => setOpen(false)}
                    onMarkRead={() => markAsRead(a.id)}
                  />
                ))}
                {lowStock.map((a) => (
                  <NotifRow
                    key={a.id}
                    icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
                    iconBg="bg-orange-50"
                    title={a.product_name}
                    body={`Stock bas — ${a.quantity} ${a.unit || "Pcs"} restant(s), seuil ${a.reorder_level}.`}
                    date={a.updated_date || a.created_date}
                    read={!!a.notified}
                    actionLabel="Voir"
                    actionTo={createPageUrl("Products")}
                    onAction={() => setOpen(false)}
                    onMarkRead={() => markAsRead(a.id)}
                  />
                ))}
              </>
            )
          ) : (
            <>
              <NotifRow
                icon={<Crown className="w-4 h-4 text-orange-500" />}
                iconBg="bg-orange-50"
                title="Passez à un plan supérieur"
                body="Débloquez plus d'articles, de factures et de fonctionnalités."
                actionLabel="Améliorer"
                actionTo={createPageUrl("Subscription")}
                onAction={() => setOpen(false)}
              />
              <NotifRow
                icon={<Gift className="w-4 h-4 text-orange-500" />}
                iconBg="bg-orange-50"
                title="Parrainez un ami"
                body="Gagne jusqu'à 100.000 en invitant tes amis"
                actionLabel="Inviter"
                actionTo="/Referral"
                onAction={() => setOpen(false)}
              />
            </>
          )}
        </div>

        {tab === "notifications" && total > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="w-full text-center text-xs font-medium text-emerald-600 hover:bg-gray-50 py-3 border-t border-gray-100"
          >
            Tout marquer comme lu
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minHeight: "unset", minWidth: "unset" }}
      className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
        active ? "bg-[#f5f2ef] text-foreground" : "bg-white text-muted-foreground hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function NotifRow({ icon, iconBg, title, body, date, read = false, actionLabel = "Voir", actionTo, onAction, onMarkRead }) {
  return (
    <Link
      to={actionTo}
      onClick={() => { onMarkRead?.(); onAction?.(); }}
      className="flex w-full items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 active:bg-gray-100 transition-colors"
      style={{ minWidth: "unset" }}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 border border-orange-500 rounded-md px-2 py-1 bg-white"
            style={{ minHeight: "unset", minWidth: "unset" }}
          >
            <Diamond className="w-3 h-3" />
            {actionLabel}
          </span>
          {date && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              {fmtRelative(date)}
              {!read && <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
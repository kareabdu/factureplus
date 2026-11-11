import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Gift, Copy, Check, Users, Wallet, Loader2, Share2, MessageCircle,
  UserPlus, CreditCard, Banknote, Sparkles, ChevronDown, ChevronUp, Hourglass, PartyPopper,
} from "lucide-react";
import { formatAmount } from "@/lib/formatAmount";

const COMMISSION_CAP = 100000;

function genCode(user) {
  const base = (user?.id || "").replace(/-/g, "").toUpperCase();
  return base ? base.slice(0, 8) : null;
}

export default function Referral() {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      let u = await base44.auth.me();
      if (!u.referral_code) {
        const code = genCode(u);
        if (code) {
          await base44.auth.updateMe({ referral_code: code });
          u = { ...u, referral_code: code };
        }
      }
      setUser(u);
      const list = await base44.entities.Referral.filter({ referrer_id: u.id }, "-created_date", 100);
      setReferrals(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === "admin";
  const referralLink = user?.referral_code ? `https://invoice.kareapps.com/register?ref=${user.referral_code}` : "";
  const commissioned = referrals.filter((r) => r.status === "commissioned");
  const totalCommission = commissioned.reduce((s, r) => s + (r.commission_amount || 0), 0);
  const totalPaid = commissioned.filter((r) => r.payment_status === "paid").reduce((s, r) => s + (r.commission_amount || 0), 0);
  const totalPending = totalCommission - totalPaid;
  const remainingCommission = Math.max(0, COMMISSION_CAP - totalCommission);
  const registeredCount = referrals.length;

  // Valeurs d'affichage spécifiques pour le compte de démonstration kareabdou@gmail.com
  const isDemoAccount = user?.email === "kareabdou@gmail.com";
  const displayPending = isDemoAccount ? 3900 : totalPending;
  const displayPaid = isDemoAccount ? 10500 : totalPaid;

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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "StockTracker",
          text: "Rejoins-moi sur StockTracker pour gérer ton stock et tes factures.",
          url: referralLink,
        });
      } catch {
        /* ignore */
      }
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const steps = [
    { icon: UserPlus, text: "Partage ton code de parrainage à ton entourage." },
    { icon: CreditCard, text: "Tes amis s'inscrivent et souscrivent un abonnement." },
    { icon: Banknote, text: "Pour chacun qui s'abonne, tu gagnes jusqu'à 1.000 F." },
    { icon: Gift, text: "Réclame tes gains via WhatsApp pour recevoir ton versement." },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-6">
      {/* Hero */}
      <div className="relative text-center pt-2 pb-1">
        <Sparkles className="absolute left-6 top-4 w-5 h-5 text-amber-400" />
        <Sparkles className="absolute right-8 top-10 w-4 h-4 text-rose-500" />
        <h1
          className="font-heading text-4xl font-extrabold tracking-tight text-emerald-600"
          style={{ textShadow: "2px 2px 0 #085827" }}
        >
          Gagne jusqu'à
          <br />
          100.000 F
        </h1>
        <p className="text-sm text-muted-foreground mt-3 px-6">
          Invitez vos amis et encaissez des commissions sur chaque abonnement souscrit.
        </p>
      </div>

      {/* Étapes */}
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <s.icon className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-foreground leading-snug">{s.text}</p>
          </div>
        ))}
      </div>

      {/* Bonus cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 bg-[#FAEBD7] dark:bg-card">
          <Hourglass className="w-5 h-5 text-foreground mb-2" />
          <p className="text-xl font-bold text-foreground">{formatAmount(displayPending, "F")}</p>
          <p className="text-xs text-muted-foreground">Bonus en attente</p>
        </div>
        <div className="rounded-2xl p-4 bg-[#E0F7EF] dark:bg-card">
          <PartyPopper className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-xl font-bold text-foreground">{formatAmount(displayPaid, "F")}</p>
          <p className="text-xs text-muted-foreground">Bonus gagné</p>
        </div>
      </div>

      {/* Voir les détails */}
      <button
        onClick={() => setShowDetails((v) => !v)}
        className="w-full text-center text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1"
        style={{ minHeight: "unset", minWidth: "unset" }}
      >
        {showDetails ? "Masquer les détails" : "Voir les détails de mes bonus"}
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showDetails && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon={Users} label="Filleuls" value={String(registeredCount)} />
            <MiniStat icon={Wallet} label="Commissions" value={formatAmount(totalCommission, "F")} />
            <MiniStat icon={Sparkles} label="Plafond restant" value={formatAmount(remainingCommission, "F")} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-foreground mb-2 px-1">Mes filleuls</h2>
            {referrals.length === 0 ? (
              <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-8 text-center">
                <Gift className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun filleul pour le moment. Partagez votre code pour commencer.</p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden divide-y divide-border/60">
                {referrals.map((r) => {
                  const paid = r.payment_status === "paid";
                  const isPending = r.status === "pending";
                  return (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.referred_email || "Filleul"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.plan || "—"} · {r.commissioned_date || r.created_date?.split("T")[0] || ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3 flex flex-col items-end gap-1">
                        <p className="text-sm font-semibold text-foreground">{formatAmount(r.commission_amount, "F")}</p>
                        {isPending ? (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            En attente d'abonnement
                          </span>
                        ) : paid ? (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Payé{r.paid_date ? ` · ${r.paid_date}` : ""}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            En attente
                          </span>
                        )}
                        {isAdmin && !paid && !isPending && (
                          <button
                            onClick={() => markAsPaid(r)}
                            disabled={markingId === r.id}
                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                            style={{ minHeight: "unset", minWidth: "unset" }}
                          >
                            {markingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Marquer payé"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Carte d'invitation */}
      <div
        className="relative overflow-hidden rounded-3xl p-5 bg-[#FBF7EC] dark:bg-card"
      >
        {/* Étoiles décoratives */}
        <Sparkles className="absolute top-4 right-5 w-4 h-4 text-emerald-300/60" />
        <Sparkles className="absolute top-12 left-8 w-3 h-3 text-emerald-300/50" />
        <Sparkles className="absolute bottom-20 right-10 w-4 h-4 text-emerald-300/50" />
        <Sparkles className="absolute bottom-6 left-4 w-3 h-3 text-emerald-300/60" />

        <div className="relative text-center">
          <p className="text-sm text-muted-foreground">Lien d'invitation</p>
          <p className="text-sm font-bold text-foreground break-all px-2 mt-1 mb-4">
            {referralLink || "—"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={shareLink}
              className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Partager
            </button>
            <button
              onClick={copyLink}
              className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
        </div>
      </div>

      {/* Réclamation des gains */}
      <a
        href="https://wa.me/221776603151"
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-sm text-white"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">Réclamez vos gains</p>
            <p className="text-xs text-white/90 mt-0.5">
              Pour recevoir le versement de vos commissions, contactez-nous par message WhatsApp uniquement au
              <span className="font-semibold"> 77 660 31 51</span>.
            </p>
          </div>
        </div>
      </a>

      <p className="text-xs text-muted-foreground text-center px-4">
        La commission est versée lorsqu'un filleul souscrit un abonnement via votre lien, puis réglée manuellement. Plafond cumulé de {formatAmount(COMMISSION_CAP, "F")} de commissions par parrain.
      </p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-3 text-center">
      <div className="w-8 h-8 mx-auto rounded-lg bg-emerald-50 flex items-center justify-center mb-1.5">
        <Icon className="w-4 h-4 text-emerald-600" />
      </div>
      <p className="text-sm font-bold text-foreground truncate">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
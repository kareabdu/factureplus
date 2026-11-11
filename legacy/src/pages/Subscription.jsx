import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Crown, ArrowRight, Loader2, Clock, X } from "lucide-react";
import { WaveLogo, MaxitLogo } from "@/components/PaymentLogos";
import WhatsAppSupport from "@/components/WhatsAppSupport";
import { loadTeamMemberInfo } from "@/lib/planLimits";
import BackToSettings from "@/components/BackToSettings";

const plans = {
  monthly: {
    name: "Mensuel",
    price: "2 900",
    currency: "CFA",
    period: "/mois",
    description: "Pour gérer votre activité au quotidien.",
    featuresHeader: "Tout inclus :",
    benefits: [
      "Factures illimitées",
      "Inventaire complet",
      "Suivi des dépenses",
      "Clients illimités",
      "Devis/Proformas",
      "Export PDF",
      "Support prioritaire",
    ],
  },
  annual: {
    name: "Annuel",
    price: "29 000",
    originalPrice: "34 800",
    currency: "CFA",
    period: "/an",
    description: "Offre spéciale : 2 mois offerts.",
    featuresHeader: "Tout dans le plan Mensuel, et :",
    benefits: [
      "2 mois offerts (29 000 CFA au lieu de 34 800 CFA)",
      "Support dédié prioritaire",
    ],
    popular: true,
  },
};

// Tarifs réduits pour les membres d'une équipe dont le propriétaire a un
// abonnement actif. Mêmes fonctionnalités, prix réduit par licence.
const memberPlans = {
  monthly: {
    ...plans.monthly,
    price: "1 500",
    originalPrice: "2 900",
    description: "Tarif membre d'équipe : même forfait, prix réduit.",
  },
  annual: {
    ...plans.annual,
    price: "17 000",
    originalPrice: "29 000",
    description: "Tarif membre d'équipe : 2 mois offerts.",
    benefits: [
      "Économisez 12 000 CFA (17 000 au lieu de 29 000)",
      "Support dédié prioritaire",
    ],
  },
};

const planLabel = (p) => ({ monthly: "01 mois", annual: "12 mois" })[p] || p;

const PAYMENT_METHODS = [
  { key: "wave", label: "Wave", logo: WaveLogo },
  { key: "orange_maxit", label: "Max It", logo: MaxitLogo },
];

export default function Subscription() {
  const [loading, setLoading] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [message, setMessage] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [method, setMethod] = useState("wave");
  const [qrData, setQrData] = useState(null);
  const [teamPlan, setTeamPlan] = useState(null);
  const [memberRate, setMemberRate] = useState(false);

  const loadUser = async () => {
    try {
      const me = await base44.auth.me();
      setCurrentPlan(me);
      // Membre d'équipe : si le propriétaire a un abonnement actif, le membre
      // bénéficie d'un tarif réduit (licence membre additionnel).
      if (me.role !== "admin" && me.subscription_status !== "active") {
        const { owner_has_plan } = await loadTeamMemberInfo(me);
        setMemberRate(owner_has_plan);
        setTeamPlan(null);
      } else {
        setMemberRate(false);
        setTeamPlan(null);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Vérifie auprès d'UnitechPay si un paiement en attente a été confirmé,
  // puis active l'abonnement si c'est le cas. (Filet de secours au webhook.)
  const verifyAndReload = async () => {
    try {
      const res = await base44.functions.invoke("unitechVerifySubscription", {});
      const data = res.data || {};
      if (data.verified) {
        const planPrice = { monthly: 2900, annual: 29000 };
        if (typeof window.fbq === "function") {
          window.fbq("track", "Subscribe", {
            value: planPrice[currentPlan?.subscription_plan] || 0,
            currency: "XOF",
          });
        }
        setMessage("Paiement confirmé ! Votre abonnement est maintenant actif.");
        await loadUser();
        setLoading(null);
        return true;
      }
      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  useEffect(() => {
    loadUser();
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    window.history.replaceState({}, document.title, "/Subscription");
    if (payment === "success") {
      setMessage("Paiement effectué. Vérification en cours...");
      verifyAndReload();
    } else if (payment === "cancel") {
      setMessage("Paiement annulé. Vous pouvez réessayer.");
    }
  }, []);

  // Polling tant qu'un paiement est en attente : récupère les cas où le webhook
  // ne parvient pas (paiement via deep link Wave/Max It, retour navigateur, etc.).
  useEffect(() => {
    if (currentPlan?.subscription_status !== "pending") return;
    let active = true;
    const tick = async () => {
      if (!active) return;
      await verifyAndReload();
    };
    tick();
    const interval = setInterval(tick, 8000);
    return () => { active = false; clearInterval(interval); };
  }, [currentPlan?.subscription_status]);

  const handleSubscribe = async (plan) => {
    setLoading(plan);
    setMessage("");
    try {
      const res = await base44.functions.invoke("unitechCreateSubscription", {
        plan,
        method,
        return_origin: window.location.origin,
      });
      const data = res.data || {};
      if (data.payment_url) {
        setCurrentPlan({ subscription_plan: plan, subscription_status: "pending" });
        window.location.href = data.payment_url;
        return;
      }
      if (data.qr_code) {
        setQrData(data);
        setCurrentPlan({ subscription_plan: plan, subscription_status: "pending" });
        setMessage("Scannez le QR Code pour payer avec Orange Money. Votre abonnement s'activera automatiquement.");
        setLoading(null);
        return;
      }
      setMessage("Réponse inattendue d'UnitechPay. Veuillez réessayer.");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Erreur lors du paiement. Veuillez réessayer.";
      setMessage(msg);
    }
    setLoading(null);
  };

  const activePlans = memberRate ? memberPlans : plans;
  const plan = activePlans[cycle];
  const PLAN_ORDER = { monthly: 2, annual: 4 };
  const isActiveSamePlan = currentPlan?.subscription_status === "active" && currentPlan?.subscription_plan === cycle;
  const isPendingSamePlan = currentPlan?.subscription_status === "pending" && currentPlan?.subscription_plan === cycle;
  const canUpgrade = currentPlan?.subscription_status === "active" && (PLAN_ORDER[cycle] ?? -1) > (PLAN_ORDER[currentPlan?.subscription_plan] ?? 99);
  const isDisabled = loading === cycle || isActiveSamePlan || (currentPlan?.subscription_status === "active" && !canUpgrade);
  const buttonContent = loading === cycle ? (
    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Paiement...</>
  ) : isActiveSamePlan ? (
    <><Check className="w-4 h-4 mr-2" /> Plan actif</>
  ) : isPendingSamePlan ? (
    <><Clock className="w-4 h-4 mr-2" /> En attente de paiement</>
  ) : canUpgrade ? (
    <><ArrowRight className="w-4 h-4 mr-2" /> Passer au plan supérieur</>
  ) : (
    <><ArrowRight className="w-4 h-4 mr-2" /> Payer maintenant</>
  );

  if (currentPlan?.role === "admin") {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-md mx-auto p-4 md:py-8">
          <BackToSettings />
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Accès total</h2>
            <p className="text-sm text-gray-500 mt-2">
              En tant que propriétaire, vous bénéficiez de toutes les fonctionnalités sans abonnement.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-md mx-auto p-4 md:py-8">
        <BackToSettings />
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Choisissez votre plan</h1>
          <p className="text-sm text-gray-500 mt-2">
            Paiement automatique via Wave & Orange Money.
          </p>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-xl text-center text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            {message}
          </div>
        )}

        {currentPlan?.subscription_status === "active" && (
          <div className="mb-4 p-3 rounded-xl text-center text-sm bg-blue-50 text-blue-700 border border-blue-200">
            <Crown className="w-4 h-4 inline mr-2" />
            Abonné au plan <strong>{planLabel(currentPlan.subscription_plan)}</strong>.
            {currentPlan.subscription_end_date && <> Renouvellement : {new Date(currentPlan.subscription_end_date).toLocaleDateString("fr-FR")}</>}
          </div>
        )}

        {currentPlan?.subscription_status === "pending" && (
          <div className="mb-4 p-3 rounded-xl text-center text-sm bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-4 h-4 inline mr-2" />
            Demande <strong>{planLabel(currentPlan.subscription_plan)}</strong> en attente de confirmation de paiement.
          </div>
        )}

        {memberRate && currentPlan?.subscription_status !== "active" && currentPlan?.subscription_status !== "pending" && (
          <div className="mb-4 p-3 rounded-xl text-center text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Crown className="w-4 h-4 inline mr-2" />
            Tarif membre d'équipe : le propriétaire a un abonnement actif. Profitez d'un forfait réduit pour accéder à toutes les fonctionnalités.
          </div>
        )}

        <div className="flex justify-center mb-7">
          <div className="inline-flex bg-gray-100 rounded-full p-1 border border-gray-200 gap-1">
            {[
              { key: "monthly", label: "01 mois" },
              { key: "annual", label: "12 mois" },
            ].map((opt) => (
              <div key={opt.key} className="relative">
                {opt.key === "annual" && cycle !== "annual" && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap z-10">
                    {memberRate ? "Économisez 41%" : "Économisez 16%"}
                  </span>
                )}
                <button
                  onClick={() => setCycle(opt.key)}
                  className={`px-4 md:px-6 py-2 rounded-full text-sm font-medium transition ${cycle === opt.key ? "bg-white text-emerald-700 shadow-sm border border-emerald-600" : "text-gray-500"}`}
                >
                  {opt.label}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-emerald-50 p-6 text-center">
            {plan.popular && (
              <span className="inline-block text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-3">
                Le Plus Populaire
              </span>
            )}
            <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
            <div className="mt-4 flex items-baseline justify-center">
              {plan.originalPrice && (
                <span className="text-base text-gray-400 line-through mr-2">{plan.originalPrice} {plan.currency}</span>
              )}
              <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
              <span className="text-base text-gray-500 ml-1">{plan.currency}</span>
              <span className="text-sm text-gray-500 ml-1">{plan.period}</span>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">{plan.featuresHeader}</p>
            <ul className="space-y-2.5 mb-6">
              {plan.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <p className="text-sm font-semibold text-gray-900 mb-2">Méthode de paiement</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PAYMENT_METHODS.map((m) => {
                const Logo = m.logo;
                const active = method === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition ${active ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    <Logo className="w-7 h-7 rounded-lg" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handleSubscribe(cycle)}
              disabled={isDisabled}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center"
            >
              {buttonContent}
            </button>
            {!isActiveSamePlan && !canUpgrade && (
              <p className="text-center text-[11px] text-gray-400 mt-3">
                Paiement sécurisé via UnitechPay. Activation automatique après confirmation.
              </p>
            )}
            <div className="mt-4">
              <WhatsAppSupport />
            </div>
          </div>
        </div>
      </div>

      {qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQrData(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Paiement Orange Money</h3>
              <button onClick={() => setQrData(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={qrData.qr_code} alt="QR Code Orange Money" className="w-48 h-48 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-3">Scannez le QR Code avec Orange Money pour payer.</p>
            {qrData.deep_links?.OM && (
              <a href={qrData.deep_links.OM} className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl mb-2">
                Ouvrir Orange Money
              </a>
            )}
            {qrData.deep_links?.MAXIT && (
              <a href={qrData.deep_links.MAXIT} className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl">
                Ouvrir Max It
              </a>
            )}
            {qrData.reference && <p className="text-xs text-gray-400 mt-3">Réf : {qrData.reference}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
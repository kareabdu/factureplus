import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { isTeamEnabled, isInventoryEnabled, loadTeamPlan } from "@/lib/planLimits";
import { isTeamOwner, getMe } from "@/lib/team";
import { FileText, ReceiptText, Package, Users, Tags, LayoutDashboard, Wallet, Truck, PackageOpen, ShieldCheck, Crown, MapPin, Gift, Settings, ClipboardList, MoreHorizontal, X, Bike, Landmark, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Factures", url: createPageUrl("Invoices"), icon: FileText },
  { label: "Devis", url: createPageUrl("Proformas"), icon: ReceiptText },
  { label: "Stock", url: createPageUrl("Products"), icon: Package, inventoryOnly: true },
];

const moreItems = [
  { label: "Clients", url: createPageUrl("Customers"), icon: Users },
  { label: "Vente", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { label: "Bons", url: createPageUrl("BordereauxLivraison"), icon: Truck },
  { label: "Livreurs", url: createPageUrl("Livreurs"), icon: Bike },
  { label: "Inventaire", url: createPageUrl("Inventaire"), icon: ClipboardList, inventoryOnly: true },
  { label: "Nouvel achat", url: "/NewPurchase", icon: ShoppingCart, inventoryOnly: true },
  { label: "Fournisseurs", url: createPageUrl("Suppliers"), icon: PackageOpen, inventoryOnly: true, ownerOnly: true },
  { label: "Catégories", url: createPageUrl("Categories"), icon: Tags, inventoryOnly: true },
  { label: "Emplacements", url: createPageUrl("Locations"), icon: MapPin, inventoryOnly: true },
  { label: "Dépenses", url: createPageUrl("Expenses"), icon: Wallet },
  { label: "Banque", url: createPageUrl("Banque"), icon: Landmark },
  { label: "Équipe & Activité", url: createPageUrl("TeamActivity"), icon: Users },
  { label: "Abonnement", url: createPageUrl("Subscription"), icon: Crown, mobileHidden: true },
  { label: "Parrainage", url: "/Referral", icon: Gift },
  { label: "Paramètres", url: "/Settings", icon: Settings },
  { label: "Administration", url: "/AdminDashboard", icon: ShieldCheck, adminOnly: true },
];

const ACTIVE_TEXT = "text-[#07A43F] dark:text-[#32D74B]";
const INACTIVE_TEXT = "text-[#8E8E93]";

export default function MobileBottomNav() {
  const location = useLocation();
  const [showMore, setShowMore] = useState(() => sessionStorage.getItem("moreOpen") === "1");
  const [user, setUser] = useState(null);
  const [, setPlanTick] = useState(0);

  React.useEffect(() => {
    let mounted = true;
    getMe().then(async (u) => {
      setUser(u);
      await loadTeamPlan(u);
      if (mounted) setPlanTick((t) => t + 1);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const userRole = user?.role ?? null;

  React.useEffect(() => {
    const allTabs = [...navItems, ...moreItems];
    const match = allTabs.find(i => i.url === location.pathname);
    if (match) sessionStorage.setItem("lastTab", location.pathname);
  }, [location.pathname]);

  // Persiste l'état ouvert du menu Plus pour le restaurer après remontage
  React.useEffect(() => {
    sessionStorage.setItem("moreOpen", showMore ? "1" : "0");
  }, [showMore]);

  // Ne referme le menu Plus que lorsqu'on atterrit sur un onglet principal ;
  // on le conserve ouvert lors d'une navigation entre éléments du menu Plus.
  React.useEffect(() => {
    const isPrimary = navItems.some(i => i.url === location.pathname);
    if (isPrimary) setShowMore(false);
  }, [location.pathname]);

  const visibleNavItems = navItems.filter(item => {
    if (item.inventoryOnly && !isInventoryEnabled(user)) return false;
    return true;
  });
  const visibleMoreItems = moreItems.filter(item => {
    if (item.adminOnly && userRole !== "admin") return false;
    if (item.ownerOnly && !isTeamOwner(user)) return false;
    if (item.label === "Équipe & Activité" && !isTeamEnabled(user)) return false;
    if (item.inventoryOnly && !isInventoryEnabled(user)) return false;
    return true;
  });
  const isMoreActive = visibleMoreItems.some(i => location.pathname === i.url);

  const moreOpen = isMoreActive || showMore;

  return (
    <>
      {/* Voile flou derrière le menu Plus */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-md"
            onClick={() => setShowMore(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Carte flottante du menu Plus */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            className="lg:hidden fixed left-3 right-3 z-50 rounded-3xl shadow-float border border-black/5 dark:border-white/10 p-3 overflow-y-auto no-scrollbar bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl"
            style={{
              bottom: "calc(96px + env(safe-area-inset-bottom))",
              maxHeight: "62vh",
            }}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="grid grid-cols-2 gap-2">
              {visibleMoreItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.label}
                    to={item.url}
                    onClick={() => setShowMore(false)}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl transition-colors active:scale-[0.97] touch-manipulation select-none ${
                      isActive ? "bg-black/[0.06] dark:bg-[#3A3A3C]" : "hover:bg-black/5 dark:hover:bg-white/5"
                    } ${item.mobileHidden ? "hidden sm:flex" : ""}`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-black/[0.04] dark:bg-white/10"
                    >
                      <item.icon className={`w-[18px] h-[18px] ${isActive ? ACTIVE_TEXT : INACTIVE_TEXT}`} strokeWidth={1.6} />
                    </div>
                    <span className={`text-[13px] font-medium leading-tight ${isActive ? ACTIVE_TEXT : "text-[#3C3C43] dark:text-[#EBEBF5]"}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre de navigation flottante en pilule — style WhatsApp iOS */}
      <nav
        className="lg:hidden fixed left-3 right-3 z-50 rounded-[26px] shadow-float border border-black/5 dark:border-white/10 bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-xl"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 8px)",
        }}
      >
        <div className="flex items-stretch justify-around px-2 py-2 pointer-events-none">
          {visibleNavItems.map((item) => {
            const isActive =
              location.pathname === item.url ||
              (item.url === createPageUrl("Invoices") && location.pathname === "/");
            return (
              <Link
                key={item.label}
                to={item.url}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 mx-0.5 touch-manipulation select-none pointer-events-auto active:scale-[0.97] ${isActive ? ACTIVE_TEXT : "text-[#3C3C43] dark:text-[#EBEBF5]"}`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-[18px] bg-[#d8f3dd] dark:bg-[#07A43F]/25"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative flex items-center justify-center h-5">
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.7} />
                </div>
                <span className={`relative text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 mx-0.5 touch-manipulation select-none pointer-events-auto active:scale-[0.97] ${moreOpen ? ACTIVE_TEXT : "text-[#3C3C43] dark:text-[#EBEBF5]"}`}
          >
            {moreOpen && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-[18px] bg-[#d8f3dd] dark:bg-[#07A43F]/25"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <div className="relative flex items-center justify-center h-5">
              {showMore ? (
                <X className="w-[18px] h-[18px]" strokeWidth={2.2} />
              ) : (
                <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={moreOpen ? 2.2 : 1.7} />
              )}
            </div>
            <span className={`relative text-[10px] leading-none ${moreOpen ? "font-semibold" : "font-medium"}`}>
              {showMore ? "Fermer" : "Plus"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
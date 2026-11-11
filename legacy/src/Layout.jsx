import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PackageOpen, LogOut, Settings, ChevronLeft, Loader2 } from "lucide-react";
import usePullToRefresh from "@/hooks/usePullToRefresh";
import { Link } from "react-router-dom";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppHelpCard from "@/components/WhatsAppHelpCard";
import {
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar } from
"@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";
import SidebarNav from "@/components/SidebarNav";
import StockAlertsBell from "@/components/StockAlertsBell";
import SettingsGearMenu from "@/components/SettingsGearMenu";
import useBlockBackOnRoot from "@/hooks/useBlockBackOnRoot";
import useScrollRestoration from "@/hooks/useScrollRestoration";
import { useIsMobile } from "@/hooks/use-mobile";
import { getMe } from "@/lib/team";

function HamburgerButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="h-11 w-11 rounded-xl flex flex-col items-center justify-center gap-[5px] bg-[#1e2d3d] hover:bg-[#253647] active:bg-[#1a2530] transition-all shadow-sm touch-none select-none"
      style={{ WebkitAppearance: 'none' }}>
      
      <span className="block w-5 h-[3px] bg-white rounded-full pointer-events-none" />
      <span className="block w-5 h-[3px] bg-white rounded-full pointer-events-none" />
      <span className="block w-5 h-[3px] bg-white rounded-full pointer-events-none" />
    </button>);

}

const rootPageNames = new Set([
"Invoices", "Proformas", "BordereauxLivraison", "Products", "Customers",
"Dashboard", "StockMovements", "Categories", "Locations", "Settings", "Analytics", "Expenses", "Team", "Activity", "Suppliers", "Referral", "AdminReferral", "Inventaire", "Livreurs", "Banque"]
);

const settingsSubPages = new Set(["CompanySettings", "InvoiceModel", "SignatureSettings", "Taxe", "Subscription", "TermsOfService", "PrivacyPolicy"]);

const pageLabels = {
  Invoices: "Factures",
  Proformas: "Devis",
  Products: "Stock",
  Customers: "Clients",
  CustomerDetail: "Client",
  AddCustomer: "Client",
  Categories: "Catégories",
  Dashboard: "Tableau de bord",
  StockMovements: "Mouvements",
  BordereauxLivraison: "Bons",
  Livreurs: "Livreurs",
  LivreurDetail: "Livreur",
  Settings: "Paramètres",
  CompanySettings: "Mon entreprise",
  InvoiceModel: "Modèle",
  AddInvoice: "Nouvelle facture",
  AddProduct: "Nouveau produit",
  ProductDetail: "Article",
  Analytics: "Analytics",
  Expenses: "Dépenses",
  Team: "Équipe & Activité",
  Activity: "Équipe & Activité",
  TeamActivity: "Équipe & Activité",
  SignatureSettings: "Signature",
  Taxe: "Taxe",
  Suppliers: "Fournisseurs",
  Inventaire: "Inventaire",
  Locations: "Emplacements",
  Banque: "Banque",
  Referral: "Parrainage",
  AdminReferral: "Parrainages",
  AddInvoiceItem: "Article",
  NewPurchase: "Nouvel achat",
  ClientPicker: "Client",
  Subscription: "Abonnement"
};

const pageContextLabels = {
  Invoices: "Ventes",
  Proformas: "Ventes",
  BordereauxLivraison: "Ventes",
  Livreurs: "Livraisons",
  LivreurDetail: "Livraisons",
  Products: "Inventaire",
  ProductDetail: "Inventaire",
  AddProduct: "Inventaire",
  Customers: "Carnet",
  CustomerDetail: "Carnet",
  AddCustomer: "Carnet",
  Categories: "Inventaire",
  Dashboard: "Bonjour 👋",
  StockMovements: "Inventaire",
  Settings: "Configuration",
  CompanySettings: "Paramètres",
  InvoiceModel: "Paramètres",
  SignatureSettings: "Paramètres",
  Taxe: "Paramètres",
  ProductRefSettings: "Paramètres",
  Analytics: "Analyses",
  Expenses: "Finance",
  Banque: "Finance",
  TeamActivity: "Équipe",
  Team: "Équipe",
  Activity: "Équipe",
  Suppliers: "Inventaire",
  Inventaire: "Inventaire",
  Locations: "Inventaire",
  Referral: "Programme",
  AdminReferral: "Programme",
  Subscription: "Abonnement",
  SubscriptionsAdmin: "Administration",
  AdminDashboard: "Administration",
  TermsOfService: "Informations",
  PrivacyPolicy: "Informations",
  AddInvoice: "Ventes",
  NewPurchase: "Inventaire",
  AddInvoiceItem: "Ventes",
  ClientPicker: "Ventes"
};

function DesktopSettingsFooter({ user }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors">
      <Link to="/Settings" className="flex items-center gap-3 flex-1 min-w-0" style={{ minHeight: "unset", minWidth: "unset" }}>
        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-xs">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-xs truncate">{user?.full_name || 'User'}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
      </Link>
      <StockAlertsBell tone="onLight" compact />
    </div>);

}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const contentRef = useRef(null);
  const scrollRef = useRef(null);
  useScrollRestoration(scrollRef, location.pathname);
  const isChildPage = currentPageName && !rootPageNames.has(currentPageName);
  const isSettingsSubPage = settingsSubPages.has(currentPageName);
  const editorPages = new Set(["AddInvoice", "AddInvoiceItem", "ClientPicker", "NewPurchase"]);
  const isEditorPage = editorPages.has(currentPageName);
  const adminPages = new Set(["AdminDashboard", "AdminReferral", "SubscriptionsAdmin"]);
  const isAdminPage = adminPages.has(currentPageName);
  const settingsPages = new Set(["Settings", "CompanySettings", "InvoiceModel", "SignatureSettings", "Taxe", "Subscription", "TermsOfService", "PrivacyPolicy", "ProductRefSettings"]);
  const isSettingsPage = settingsPages.has(currentPageName);
  const noSelectPages = new Set(["Settings", "CompanySettings", "InvoiceModel", "SignatureSettings", "Taxe", "Subscription", "TermsOfService", "PrivacyPolicy", "ProductRefSettings", "Dashboard", "AdminDashboard"]);
  const isNoSelectPage = noSelectPages.has(currentPageName);
  const isRootPage = !isChildPage;
  useBlockBackOnRoot(isRootPage, currentPageName);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await getMe();
      setUser(userData);
    } catch (error) {
      console.log("User not logged in");
    }
  };

  const handleLogout = async () => {
    await User.logout();
    window.location.href = "/login";
  };

  const handleRefresh = useCallback(async () => {
    setRefreshKey((k) => k + 1);
    // keep the refresh indicator visible while the remounted page re-fetches
    await new Promise((r) => setTimeout(r, 700));
  }, []);

  const { pulling, pullDistance, refreshing } = usePullToRefresh(
    isEditorPage ? null : handleRefresh,
    contentRef
  );

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-[#F5F3F2] overflow-hidden">
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="border-b border-border/60 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                <img src="https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/494a02179_logo-vert-512.png" alt="StockTracker" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-xl text-foreground">StockTracker</h2>
                <p className="text-xs text-muted-foreground">Suivi de Stock</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarNav />

          <SidebarFooter className="border-t border-border/60 p-0">
            <DesktopSettingsFooter user={user} />
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {!isEditorPage &&
          <header className="px-4 lg:hidden relative z-50 border-b border-border/60 bg-[#F5F3F2] dark:bg-card" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: '10px' }}>
              <div className="flex items-center gap-2">
                {isChildPage && !isSettingsSubPage ?
              <button
                onClick={() => navigate(-1)}
                className="h-10 w-10 -ml-1 rounded-xl flex items-center justify-center hover:bg-muted active:bg-muted active:scale-95 transition-all flex-shrink-0"
                style={{ minHeight: "unset", minWidth: "unset" }}>
                
                    <ChevronLeft className="w-6 h-6 text-foreground" />
                  </button> :
              null}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground leading-tight truncate">
                    {currentPageName === "Dashboard" && user?.full_name ? `Bonjour, ${user.full_name.split(" ")[0]}` : currentPageName ? pageContextLabels[currentPageName] || "" : ""}
                  </p>
                  <h1 className="text-xl font-bold text-foreground leading-tight truncate">{currentPageName ? pageLabels[currentPageName] || currentPageName : ""}</h1>
                </div>
                <div
                  className="self-stretch flex items-stretch gap-0 flex-shrink-0 -mr-2 [&>button]:h-auto [&>button]:w-10 [&>button]:pb-[10px]"
                  style={{ marginTop: 'calc(-1 * (env(safe-area-inset-top) + 10px))', marginBottom: '-10px' }}>
                  <StockAlertsBell tone="onLight" compact />
                  <SettingsGearMenu user={user} />
                </div>
              </div>
            </header>
          }


          <div ref={scrollRef} className="flex-1 overflow-y-auto lg:pb-0 relative bg-[#F5F3F2]" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))', overscrollBehaviorY: 'none' }}>
            {!isEditorPage && (pulling || refreshing) &&
            <div className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-40" style={{ top: refreshing ? 10 : Math.min(pullDistance * 0.5, 40) }}>
                <div className="bg-white rounded-full shadow-md p-2 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                </div>
              </div>
            }
            <div ref={contentRef}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: isMobile ? 8 : 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

                  <div key={refreshKey} className={`${isSettingsPage ? "" : "lg:max-w-6xl lg:mx-auto lg:px-8"} ${isNoSelectPage ? "select-none" : ""}`}>{children}</div>
                </motion.div>
            </div>
          </div>
        </main>
      </div>
      {!isEditorPage && <MobileBottomNav />}
      {currentPageName === "Dashboard" && <WhatsAppHelpCard className="fixed bottom-6 right-6 z-40" />}
    </SidebarProvider>);

}
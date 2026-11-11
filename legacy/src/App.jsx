import { useState, useEffect } from "react"
import { Toaster } from "@/components/ui/toaster"
import Splash from "@/components/Splash";
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import OwnerGate from '@/components/OwnerGate';
import AppUnavailable from '@/components/AppUnavailable';
import Subscription from './pages/Subscription';
import SubscriptionsAdmin from './pages/SubscriptionsAdmin';
import Customers from './pages/Customers';
import AdminDashboard from './pages/AdminDashboard';
import CompanySettings from './pages/CompanySettings';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AddInvoiceItem from './pages/AddInvoiceItem';
import InvoiceModel from './pages/InvoiceModel';
import CustomerDetail from './pages/CustomerDetail';
import AddCustomer from './pages/AddCustomer';
import Expenses from './pages/Expenses';
import SignatureSettings from './pages/SignatureSettings';
import ClientPicker from './pages/ClientPicker';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TeamActivity from './pages/TeamActivity';
import BordereauxLivraison from './pages/BordereauxLivraison';
import Taxe from './pages/Taxe';
import Suppliers from './pages/Suppliers';
import Locations from './pages/Locations';
import Landing from './pages/Landing';
import Referral from './pages/Referral';
import AdminReferral from './pages/AdminReferral';
import ProductRefSettings from './pages/ProductRefSettings';
import Inventaire from './pages/Inventaire';
import InventoryTutorial from './pages/InventoryTutorial';
import Livreurs from './pages/Livreurs';
import LivreurDetail from './pages/LivreurDetail';
import AcceptInvitation from './pages/AcceptInvitation';
import Banque from './pages/Banque';
import NewPurchase from './pages/NewPurchase';
import ProductDetail from './pages/ProductDetail';


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;


const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingPublicSettings, authError } = useAuth();

  // La page "À propos" est une page publique autonome, indépendante de l'app
  // StockTracker : affichée sans le shell de l'app et sans dépendre de l'état
  // d'authentification ni du chargement des paramètres.
  if (location.pathname === '/about') {
    return <Landing />;
  }

  // Show loading spinner while checking app public settings
  if (isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // App indisponible (erreur de chargement / service injoignable)
  if (authError && authError.type !== 'user_not_registered' && authError.type !== 'auth_required') {
    return <AppUnavailable />;
  }

  // Render the main app — all app routes are gated by ProtectedRoute,
  // which redirects unauthenticated users to /login and shows
  // UserNotRegisteredError for unregistered users.
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<Landing />} />
          <Route path="/TermsOfService" element={<TermsOfService />} />
          <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
          <Route path="/InventoryTutorial" element={<InventoryTutorial />} />
          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route path="/app" element={
              <LayoutWrapper currentPageName={mainPageKey}>
                <MainPage />
              </LayoutWrapper>
            } />
            {Object.entries(Pages).map(([path, Page]) => (
              <Route
                key={path}
                path={`/${path}`}
                element={
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                }
              />
            ))}
            <Route path="/Subscription" element={<LayoutWrapper currentPageName="Subscription"><Subscription /></LayoutWrapper>} />
            <Route path="/SubscriptionsAdmin" element={<LayoutWrapper currentPageName="SubscriptionsAdmin"><SubscriptionsAdmin /></LayoutWrapper>} />
            <Route path="/Customers" element={<LayoutWrapper currentPageName="Customers"><Customers /></LayoutWrapper>} />
            <Route path="/AdminDashboard" element={<LayoutWrapper currentPageName="AdminDashboard"><AdminDashboard /></LayoutWrapper>} />
            <Route path="/CompanySettings" element={<LayoutWrapper currentPageName="CompanySettings"><CompanySettings /></LayoutWrapper>} />
            <Route path="/AddInvoiceItem" element={<LayoutWrapper currentPageName="AddInvoiceItem"><AddInvoiceItem /></LayoutWrapper>} />
            <Route path="/InvoiceModel" element={<LayoutWrapper currentPageName="InvoiceModel"><InvoiceModel /></LayoutWrapper>} />
            <Route path="/CustomerDetail" element={<LayoutWrapper currentPageName="CustomerDetail"><CustomerDetail /></LayoutWrapper>} />
            <Route path="/AddCustomer" element={<LayoutWrapper currentPageName="AddCustomer"><AddCustomer /></LayoutWrapper>} />
            <Route path="/Expenses" element={<LayoutWrapper currentPageName="Expenses"><Expenses /></LayoutWrapper>} />
            <Route path="/SignatureSettings" element={<LayoutWrapper currentPageName="SignatureSettings"><SignatureSettings /></LayoutWrapper>} />
            <Route path="/ClientPicker" element={<LayoutWrapper currentPageName="ClientPicker"><ClientPicker /></LayoutWrapper>} />
            <Route path="/TeamActivity" element={<LayoutWrapper currentPageName="TeamActivity"><TeamActivity /></LayoutWrapper>} />
            <Route path="/Team" element={<LayoutWrapper currentPageName="TeamActivity"><TeamActivity /></LayoutWrapper>} />
            <Route path="/Activity" element={<LayoutWrapper currentPageName="TeamActivity"><TeamActivity /></LayoutWrapper>} />
            <Route path="/BordereauxLivraison" element={<LayoutWrapper currentPageName="BordereauxLivraison"><BordereauxLivraison /></LayoutWrapper>} />
            <Route path="/Taxe" element={<LayoutWrapper currentPageName="Taxe"><Taxe /></LayoutWrapper>} />
            <Route path="/Suppliers" element={<LayoutWrapper currentPageName="Suppliers"><OwnerGate><Suppliers /></OwnerGate></LayoutWrapper>} />
            <Route path="/Locations" element={<LayoutWrapper currentPageName="Locations"><Locations /></LayoutWrapper>} />
            <Route path="/Referral" element={<LayoutWrapper currentPageName="Referral"><Referral /></LayoutWrapper>} />
            <Route path="/AdminReferral" element={<LayoutWrapper currentPageName="AdminReferral"><AdminReferral /></LayoutWrapper>} />
            <Route path="/ProductRefSettings" element={<LayoutWrapper currentPageName="ProductRefSettings"><ProductRefSettings /></LayoutWrapper>} />
            <Route path="/Inventaire" element={<LayoutWrapper currentPageName="Inventaire"><Inventaire /></LayoutWrapper>} />
            <Route path="/Livreurs" element={<LayoutWrapper currentPageName="Livreurs"><Livreurs /></LayoutWrapper>} />
            <Route path="/LivreurDetail" element={<LayoutWrapper currentPageName="LivreurDetail"><LivreurDetail /></LayoutWrapper>} />
            <Route path="/AcceptInvitation" element={<AcceptInvitation />} />
            <Route path="/Banque" element={<LayoutWrapper currentPageName="Banque"><Banque /></LayoutWrapper>} />
            <Route path="/NewPurchase" element={<LayoutWrapper currentPageName="NewPurchase"><NewPurchase /></LayoutWrapper>} />
            <Route path="/ProductDetail" element={<LayoutWrapper currentPageName="ProductDetail"><ProductDetail /></LayoutWrapper>} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
    </div>
  );
};


function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 400);
    return () => clearTimeout(t);
  }, []);

  // Global input trimming: removes leading/trailing whitespace from text
  // inputs and textareas on blur, across every form in the app.
  useEffect(() => {
    const handler = (e) => {
      const el = e.target;
      if (!el || !el.tagName) return;
      const tag = el.tagName;
      const type = (el.type || "").toLowerCase();
      const isText =
        (tag === "INPUT" && ["text", "tel", "email", "search", "url", ""].includes(type)) ||
        tag === "TEXTAREA";
      if (!isText || type === "password") return;
      const val = el.value;
      if (typeof val !== "string" || val === val.trim()) return;
      const proto = tag === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value");
      if (setter && setter.set) {
        setter.set.call(el, val.trim());
      } else {
        el.value = val.trim();
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    document.addEventListener("focusout", handler);
    return () => document.removeEventListener("focusout", handler);
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <AnimatePresence>
          {showSplash && <Splash key="splash" />}
        </AnimatePresence>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
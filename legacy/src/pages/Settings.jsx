import React, { useState, useEffect } from "react";
import { ChevronRight, Trash2, Building2, Palette, FileText, Shield, PenLine, Percent, KeyRound, Crown, LogOut, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import ThemeSelector from "@/components/ThemeSelector";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import { loadTeamPlan, PLAN_LABEL } from "@/lib/planLimits";

function SettingsRow({ icon: Icon, label, to, href, onClick, danger, rightElement }) {
  const inner = (
    <div className={`flex items-center justify-between px-4 py-3.5 ${danger ? "text-red-500" : "text-foreground"}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? "bg-red-50" : "bg-emerald-50"}`}>
            <Icon className={`w-4 h-4 ${danger ? "text-red-500" : "text-emerald-600"}`} />
          </div>
        )}
        <p className={`text-sm font-medium truncate ${danger ? "text-red-500" : "text-foreground"}`}>{label}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {rightElement}
        {href ? <ExternalLink className="w-4 h-4 text-muted-foreground/60" /> : onClick || to ? <ChevronRight className="w-4 h-4 text-muted-foreground/60" /> : null}
      </div>
    </div>
  );

  const cls = "block w-full text-left hover:bg-muted/50 active:bg-muted transition-colors";

  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className={`${cls} w-full`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

function SettingsGroup({ children }) {
  return (
    <div className="mx-4 mb-4 bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden divide-y divide-border/60">
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [planLabel, setPlanLabel] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      try {
        if (u?.subscription_status === "active" && u.subscription_plan) {
          setPlanLabel(PLAN_LABEL[u.subscription_plan] || u.subscription_plan);
        } else if (u?.role !== "admin") {
          const tp = await loadTeamPlan(u);
          setPlanLabel(tp ? PLAN_LABEL[tp] || tp : "Gratuit");
        } else {
          setPlanLabel("Gratuit");
        }
      } catch {
        setPlanLabel("Gratuit");
      }
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout("/");
  };

  const handleConfirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await base44.functions.invoke("deleteMyAccount");
      toast({ title: "Compte désactivé", description: "Vous avez 30 jours pour le récupérer en vous reconnectant." });
      try { localStorage.clear(); } catch { /* ignore */ }
      await base44.auth.logout("/");
    } catch (err) {
      setDeleting(false);
      setDeleteOpen(false);
      toast({ title: "Erreur", description: err?.message || "Suppression impossible", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3F2] md:bg-background">
      {/* En-tête desktop */}
      <div className="hidden md:block pt-8 px-8">
        <h1 className="font-heading text-3xl font-semibold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configurez votre entreprise et votre compte</p>
      </div>

      <div className="max-w-2xl md:max-w-5xl mx-auto pt-5 md:pt-8 px-4 md:px-8 pb-32">
        <div className="md:grid md:grid-cols-2 md:gap-6">
          {/* Groupe 1 — Paramètres facture */}
          <SettingsGroup>
            <SettingsRow
              icon={Building2}
              label="Données commerciales"
              to={createPageUrl("CompanySettings")}
            />
            <SettingsRow
              icon={Palette}
              label="Conception & style"
              to={createPageUrl("InvoiceModel")}
            />
            <SettingsRow
              icon={PenLine}
              label="Signature/Cachet"
              to={createPageUrl("SignatureSettings")}
            />
            <SettingsRow
              icon={Percent}
              label="TAX"
              to={createPageUrl("Taxe")}
            />
          </SettingsGroup>

          <SettingsGroup>
            <ThemeSelector />
          </SettingsGroup>

          {/* Groupe 2 — Abonnement */}
          <SettingsGroup>
            <SettingsRow
              icon={Crown}
              label="Abonnement"
              to={createPageUrl("Subscription")}
              rightElement={<span className="text-xs text-muted-foreground">{planLabel}</span>}
            />
          </SettingsGroup>

          {/* Groupe 3 — Compte */}
          <SettingsGroup>
            <SettingsRow
              icon={KeyRound}
              label="Changer le mot de passe"
              onClick={() => setPasswordOpen(true)}
            />
            <SettingsRow
              icon={Trash2}
              label="Supprimer le compte"
              danger
              onClick={() => setDeleteOpen(true)}
            />
          </SettingsGroup>

          {/* Groupe 4 — Information */}
          <SettingsGroup>
            <SettingsRow
              icon={FileText}
              label="Conditions d'utilisation"
              to="/TermsOfService"
            />
            <SettingsRow
              icon={Shield}
              label="Politique de confidentialité"
              to="/PrivacyPolicy"
            />
          </SettingsGroup>
        </div>

        {/* Déconnexion + version */}
        <div className="mx-4 md:mx-0 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full bg-card border border-red-200 rounded-2xl py-4 text-red-500 font-semibold text-sm hover:bg-red-50 active:bg-red-100 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
          <p className="text-center text-xs text-gray-400 pt-1">StockTracker v3.26.8</p>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre compte sera désactivé. Vous disposez d'un délai de 30 jours pour le récupérer en vous reconnectant avec vos identifiants. Au-delà, la suppression deviendra définitive et toutes vos données (factures, produits, clients, paramètres) seront effacées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        user={user}
      />

    </div>
  );
}
import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Lock, Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import WhatsAppHelpCard from "@/components/WhatsAppHelpCard";
import WhatsAppFab from "@/components/WhatsAppFab";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Échec de la réinitialisation du mot de passe");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <>
        <AuthSplitLayout
          title="Lien de réinitialisation invalide"
          subtitle="Ce lien de réinitialisation est manquant ou invalide"
          footer={
            <Link to="/forgot-password" className="text-green-400 md:text-green-600 font-semibold hover:underline">
              Demander un nouveau lien
            </Link>
          }
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/15 md:bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-400 md:text-amber-600" />
            </div>
            <p className="text-sm text-white/80 md:text-slate-600">
              Le lien que vous avez utilisé semble incomplet. Veuillez demander un nouvel e-mail de réinitialisation.
            </p>
          </div>
        </AuthSplitLayout>
        <WhatsAppFab bottom="calc(20px + env(safe-area-inset-bottom))" />
      </>
    );
  }

  return (
    <>
      <AuthSplitLayout
        title="Nouveau mot de passe"
        subtitle="Entrez votre nouveau mot de passe ci-dessous"
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-[#FF8A80]/40 md:bg-red-50 md:border-red-200 text-[#FF8A80] md:text-red-600 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/85 md:text-slate-700">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 md:text-slate-400" />
              <input
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                autoFocus
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full h-9 rounded-xl border border-green-400 bg-transparent pl-11 pr-12 text-sm text-white placeholder:text-white/55 transition focus:outline-none focus:ring-2 focus:border-green-400 focus:ring-green-400/20 md:bg-slate-100 md:text-slate-900 md:placeholder:text-slate-400 md:border-slate-200 md:focus:border-green-600 md:focus:ring-green-500/20"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white md:text-slate-400 md:hover:text-slate-600 transition-colors"
                aria-label="Afficher le mot de passe"
              >
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/85 md:text-slate-700">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 md:text-slate-400" />
              <input
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full h-9 rounded-xl border border-green-400 bg-transparent pl-11 pr-12 text-sm text-white placeholder:text-white/55 transition focus:outline-none focus:ring-2 focus:border-green-400 focus:ring-green-400/20 md:bg-slate-100 md:text-slate-900 md:placeholder:text-slate-400 md:border-slate-200 md:focus:border-green-600 md:focus:ring-green-500/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white md:text-slate-400 md:hover:text-slate-600 transition-colors"
                aria-label="Afficher le mot de passe"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 !min-h-0 rounded-xl bg-green-500 hover:bg-green-600 md:bg-green-600 md:hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Réinitialisation...
              </>
            ) : (
              "Réinitialiser le mot de passe"
            )}
          </button>
          <WhatsAppHelpCard className="" />
        </form>
      </AuthSplitLayout>
      <WhatsAppFab bottom="calc(20px + env(safe-area-inset-bottom))" />
    </>
  );
}
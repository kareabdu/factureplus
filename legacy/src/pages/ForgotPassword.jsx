import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import WhatsAppHelpCard from "@/components/WhatsAppHelpCard";
import WhatsAppFab from "@/components/WhatsAppFab";
import { useBotProtection, HoneypotField } from "@/hooks/useBotProtection.jsx";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const bot = useBotProtection();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const showEmailError = emailTouched && email.length > 0 && !emailValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (bot.isLocked) {
      setError(`Trop de tentatives. Réessayez dans ${bot.lockSeconds}s.`);
      return;
    }
    const guard = bot.check();
    if (!guard.ok) {
      bot.recordFailure();
      setError("Vérification impossible, veuillez réessayer.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
      setSent(true);
    } catch (err) {
      bot.recordFailure();
      setError(err.message || "Échec de l'envoi du lien.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthSplitLayout
        title="Mot de passe oublié"
        subtitle="Entrez votre email, nous vous enverrons un lien de réinitialisation"
        footer={
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-green-400 md:text-green-600 font-semibold hover:underline"
          >
            Retour à la connexion
          </button>
        }
      >
        {sent ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-green-400/30 bg-green-500/10 p-4 md:border-green-200 md:bg-green-50">
              <CheckCircle className="w-5 h-5 text-green-400 md:text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-200 md:text-green-800">
                Un lien de réinitialisation a été envoyé à{" "}
                <span className="font-medium">{email}</span> s'il correspond à un compte.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full h-9 !min-h-0 rounded-xl bg-green-500 hover:bg-green-600 md:bg-green-600 md:hover:bg-green-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <HoneypotField value={bot.honeypot} onChange={bot.setHoneypot} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/85 md:text-slate-700">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 md:text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  required
                  placeholder="vous@exemple.com"
                  className={`w-full h-9 rounded-xl border bg-transparent pl-11 pr-3 text-sm text-white placeholder:text-white/55 transition focus:outline-none focus:ring-2 focus:border-green-400 focus:ring-green-400/20 md:bg-slate-100 md:text-slate-900 md:placeholder:text-slate-400 ${
                    showEmailError
                      ? "border-[#FF8A80] md:border-red-300 md:focus:border-red-500 md:focus:ring-red-500/20"
                      : "border-green-400 md:border-slate-200 md:focus:border-green-600 md:focus:ring-green-500/20"
                  }`}
                />
              </div>
              {showEmailError && <p className="text-xs text-[#FF8A80] md:text-red-500">Format d'adresse e-mail invalide.</p>}
            </div>
            {error && <p className="text-sm text-[#FF8A80] md:text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 !min-h-0 rounded-xl bg-green-500 hover:bg-green-600 md:bg-green-600 md:hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Envoi...
                </>
              ) : (
                "Continuer"
              )}
            </button>
            <WhatsAppHelpCard className="" />
          </form>
        )}
      </AuthSplitLayout>
      <WhatsAppFab bottom="calc(20px + env(safe-area-inset-bottom))" />
    </>
  );
}
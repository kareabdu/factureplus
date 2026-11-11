import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff, Mail, Lock, Loader2, Check } from "lucide-react";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import SsoButtons from "@/components/auth/SsoButtons";
import OtpInput from "@/components/auth/OtpInput";
import WhatsAppHelpCard from "@/components/WhatsAppHelpCard";
import WhatsAppFab from "@/components/WhatsAppFab";
import InstallAppButton from "@/components/InstallAppButton";
import { useAuth } from "@/lib/AuthContext";
import { useBotProtection, HoneypotField } from "@/hooks/useBotProtection.jsx";

export default function Register() {
  const navigate = useNavigate();
  const { forceReauth } = useAuth();

  useEffect(() => {
    forceReauth();
  }, [forceReauth]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const bot = useBotProtection();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) localStorage.setItem("ref_code", ref);
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const showEmailError = emailTouched && email.length > 0 && !emailValid;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setEmailExists(false);
    if (bot.isLocked) {
      setError(`Trop de tentatives. Réessayez dans ${bot.lockSeconds}s.`);
      return;
    }
    if (!agreed) {
      setError("Veuillez accepter les conditions pour continuer.");
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
      await base44.auth.register({ email, password });
      setOtpSent(true);
    } catch (err) {
      bot.recordFailure();
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("already exists") || err.status === 409 || err.status === 400) {
        setEmailExists(true);
        setError("Un utilisateur avec cet e-mail existe déjà.");
      } else if (err.status === 429) {
        setError("Trop de tentatives. Réessayez plus tard.");
      } else if (err.status === 0 || /network|fetch|failed to fetch/i.test(msg)) {
        setError("Connexion réseau impossible. Vérifiez votre connexion internet.");
      } else {
        setError("Inscription impossible. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (codeArg) => {
    const code = (codeArg || "").replace(/\D/g, "");
    if (code.length < 6) return;
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode: code });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      if (typeof window.fbq === "function") window.fbq("track", "CompleteRegistration");
      const refCode = localStorage.getItem("ref_code");
      if (refCode) {
        try {
          await base44.auth.updateMe({ referred_by_code: refCode });
          await base44.functions.invoke("registerReferral", { code: refCode });
        } catch {

          /* ignore */}
        localStorage.removeItem("ref_code");
      }
      window.location.href = "/app";
    } catch (err) {
      const msg = (err?.message || "").toLowerCase();
      if (err.status === 400 || /invalid|incorrect|expired/i.test(msg)) setError("Code de vérification invalide ou expiré.");else
      if (err.status === 429) setError("Trop de tentatives. Réessayez plus tard.");else
      if (err.status === 0 || /network|fetch|failed to fetch/i.test(msg)) setError("Connexion réseau impossible. Vérifiez votre connexion internet.");else
      setError("Vérification impossible. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    verifyCode(otp);
  };

  const resendOtp = async () => {
    try {
      await base44.auth.resendOtp(email);
    } catch {

      /* ignore */}
  };

  if (otpSent) {
    return (
      <>
        <AuthSplitLayout
          title="Vérifiez votre email"
          subtitle={
          <>
              Un code a été envoyé à <span className="font-medium text-white md:text-slate-900">{email}</span>
            </>
          }>
          
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/85 md:text-slate-700">Code de vérification</label>
              <OtpInput value={otp} onChange={setOtp} onComplete={verifyCode} />
            </div>
            {error && <p className="text-sm text-[#FF8A80] md:text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 !min-h-0 rounded-xl bg-green-500 hover:bg-green-600 md:bg-green-600 md:hover:bg-green-700 text-white font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
              
              {loading ?
              <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Vérification...
                </> :

              "Vérifier"
              }
            </button>
            <button
              type="button"
              onClick={resendOtp}
              className="w-full text-sm text-green-400 md:text-green-600 hover:underline text-center">
              
              Renvoyer le code
            </button>
          </form>
        </AuthSplitLayout>
        <WhatsAppFab bottom="calc(20px + env(safe-area-inset-bottom))" />
      </>);

  }

  return (
    <>
      <AuthSplitLayout
        title="Créer un compte"
        subtitle="Quelques secondes suffisent pour commencer"
        footer={
        <>
            Déjà inscrit ?{" "}
            <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-green-400 md:text-green-600 font-semibold hover:underline">
            
              Connectez-vous
            </button>
          </>
        }>
        
        <form onSubmit={handleRegister} className="space-y-2">
          <HoneypotField value={bot.honeypot} onChange={bot.setHoneypot} />

          <SsoButtons providers={["google"]} />

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20 md:border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0C1F15] px-3 text-xs text-white/55 md:bg-white md:text-slate-400">ou</span>
            </div>
          </div>

          {/* Email */}
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
                placeholder="Adresse e-mail"
                className={`w-full h-9 rounded-xl border border-green-400 bg-transparent pl-11 pr-3 text-sm text-white placeholder:text-white/55 transition focus:outline-none focus:ring-2 focus:border-green-400 focus:ring-green-400/20 md:bg-slate-100 md:text-slate-900 md:placeholder:text-slate-400 ${
                showEmailError ?
                "md:border-red-300 md:focus:border-red-500 md:focus:ring-red-500/20" :
                "md:border-slate-200 md:focus:border-green-600 md:focus:ring-green-500/20"}`
                } />
              
            </div>
            {showEmailError && <p className="text-xs text-[#FF8A80] md:text-red-500">Format d'adresse e-mail invalide.</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/85 md:text-slate-700">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 md:text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-9 rounded-xl border border-green-400 bg-transparent pl-11 pr-12 text-sm text-white placeholder:text-white/55 transition focus:outline-none focus:ring-2 focus:border-green-400 focus:ring-green-400/20 md:bg-slate-100 md:text-slate-900 md:placeholder:text-slate-400 md:border-slate-200 md:focus:border-green-600 md:focus:ring-green-500/20" />
              
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white md:text-slate-400 md:hover:text-slate-600 transition-colors"
                aria-label="Afficher le mot de passe">
                
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <button
              type="button"
              role="checkbox"
              aria-checked={agreed}
              onClick={() => setAgreed((a) => !a)}
              className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors flex-shrink-0 !min-h-0 !min-w-0 ${
              agreed ? "bg-green-400 border-green-400 md:bg-green-600 md:border-green-600" : "bg-transparent border-green-400 md:bg-white md:border-slate-300 md:hover:border-green-400"}`
              }>
              
              {agreed && <Check className="w-2.5 h-2.5 text-white" />}
            </button>
            <span className="text-[10px] text-white/70 md:text-slate-500 leading-snug">
              J'accepte les{" "}
              <button
                type="button"
                onClick={() => navigate("/TermsOfService")}
                className="text-green-400 md:text-green-600 font-medium inline !min-h-0 !min-w-0 p-0 h-auto leading-snug hover:underline">
                
                Conditions d'utilisation
              </button>
              {" et la "}
              <button
                type="button"
                onClick={() => navigate("/PrivacyPolicy")}
                className="text-green-400 md:text-green-600 font-medium inline !min-h-0 !min-w-0 p-0 h-auto leading-snug hover:underline">
                
                Politique de confidentialité
              </button>
              {" de StockTracker."}
            </span>
          </label>

          {error &&
          <div className="text-sm text-[#FF8A80] md:text-red-600 space-y-2">
              <p>{error}</p>
              {emailExists &&
            <p>
                  {"Déjà inscrit ? "}
                  <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-green-400 md:text-green-600 font-semibold hover:underline inline !min-h-0 !min-w-0 p-0 h-auto leading-snug">
                
                    Connectez-vous
                  </button>
                  {"."}
                </p>
            }
            </div>
          }

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 !min-h-0 rounded-xl bg-green-500 hover:bg-green-600 md:bg-green-600 md:hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
            
            {loading ?
            <>
                <Loader2 className="w-5 h-5 animate-spin" /> Création...
              </> :

            "Continuer"
            }
          </button>

          <WhatsAppHelpCard className="" />
          <InstallAppButton />
        </form>
      </AuthSplitLayout>
      <WhatsAppFab bottom="calc(20px + env(safe-area-inset-bottom))" />
    </>);

}
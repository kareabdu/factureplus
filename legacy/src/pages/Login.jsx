import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff, Mail, Lock, Loader2, Check, MessageCircle } from "lucide-react";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import SsoButtons from "@/components/auth/SsoButtons";
import WhatsAppHelpCard from "@/components/WhatsAppHelpCard";
import InstallAppButton from "@/components/InstallAppButton";
import { useAuth } from "@/lib/AuthContext";
import { useBotProtection, HoneypotField } from "@/hooks/useBotProtection.jsx";
import useIsAndroid from "@/hooks/useIsAndroid";

const REMEMBER_KEY = "stocktracker_remember_creds";

const WHATSAPP_URL = `https://wa.me/221778339771?text=${encodeURIComponent(
  "Bonjour, j'ai besoin d'aide concernant StockTracker."
)}`;

export default function Login() {
  const navigate = useNavigate();
  const { forceReauth } = useAuth();

  useEffect(() => {
    forceReauth();
  }, [forceReauth]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  const bot = useBotProtection();
  const isAndroid = useIsAndroid();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        setEmail(stored.email || "");
        setRemember(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("account") === "expired") {
      setError("Le délai de 30 jours est dépassé. Votre compte a été définitivement supprimé.");
    }
  }, []);

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
      if (remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));else
      localStorage.removeItem(REMEMBER_KEY);
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/app";
    } catch (err) {
      bot.recordFailure();
      if (err.status === 401) setError("Email ou mot de passe incorrect.");else
      if (err.status === 403) setError("Email non encore vérifié.");else
      if (err.status === 429) setError("Trop de tentatives. Réessayez plus tard.");else
      if (err.status === 0 || /network|fetch|failed to fetch/i.test(err.message || "")) setError("Connexion réseau impossible. Vérifiez votre connexion internet.");else
      setError("Échec de la connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthSplitLayout
        title="Se Connecter"
        footer={
          isMobile ? (
            <span className="flex items-center w-full">
              <span className="flex-1 text-center">
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-green-400 font-semibold hover:underline">
                  S'inscrire
                </button>
              </span>
              {isAndroid ? (
                <InstallAppButton variant="icon" />
              ) : (
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Aide WhatsApp"
                  className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366] shadow-lg active:scale-95 transition-transform !min-h-0 !min-w-0">
                  <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-40" />
                  <span className="absolute -inset-1 rounded-full bg-[#25D366]/30 blur-md animate-pulse" />
                  <MessageCircle className="relative w-7 h-7 text-white" fill="white" strokeWidth={0} />
                </a>
              )}
            </span>
          ) : (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-green-600 font-semibold hover:underline">
                S'inscrire
              </button>
            </>
          )
        }>
        
        <form onSubmit={handleSubmit} className="space-y-2">
          <HoneypotField value={bot.honeypot} onChange={bot.setHoneypot} />

          <SsoButtons providers={["google"]} />

          <div className="relative my-0.5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20 md:border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0C1F15] px-3 text-xs text-white/55 md:bg-white md:text-slate-400">ou</span>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-white/85 md:text-slate-700">Adresse e-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 md:text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailTouched(false)}
                onBlur={() => setEmailTouched(true)}
                required
                placeholder="Adresse e-mail"
                className={`w-full h-9 rounded-xl border border-green-400 bg-transparent pl-10 pr-3 text-sm text-white placeholder:text-white/55 transition focus:outline-none focus:ring-2 focus:border-green-400 focus:ring-green-400/20 md:bg-slate-100 md:text-slate-900 md:placeholder:text-slate-400 ${
                showEmailError ?
                "md:border-red-300 md:focus:border-red-500 md:focus:ring-red-500/20" :
                "md:border-slate-200 md:focus:border-green-600 md:focus:ring-green-500/20"}`
                } />
            </div>
          </div>
          {showEmailError && <p className="text-xs text-[#FF8A80] md:text-red-500">Format d'adresse e-mail invalide.</p>}

          {(isMobile ? email.trim().length > 0 : true) && (
            <div className={`${isMobile ? "popover-fade" : ""} space-y-2`}>
              {/* Password */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-white/85 md:text-slate-700">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 md:text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mot de passe"
                    className="w-full h-9 rounded-xl border border-green-400 bg-transparent pl-10 pr-10 text-sm text-white placeholder:text-white/55 transition focus:outline-none focus:ring-2 focus:border-green-400 focus:ring-green-400/20 md:bg-slate-100 md:text-slate-900 md:placeholder:text-slate-400 md:border-slate-200 md:focus:border-green-600 md:focus:ring-green-500/20" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white md:text-slate-400 md:hover:text-slate-600 transition-colors"
                    aria-label="Afficher le mot de passe">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={remember}
                    onClick={() => setRemember((r) => !r)}
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors !min-h-0 !min-w-0 ${
                    remember ? "bg-green-400 border-green-400 md:bg-green-600 md:border-green-600" : "bg-transparent border-green-400 md:bg-white md:border-slate-300 md:hover:border-green-400"}`
                    }>
                    
                    {remember && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-xs text-white/80 md:text-slate-600">Se souvenir de moi</span>
                </label>
              </div>

              {error && <p className="text-sm text-[#FF8A80] md:text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 !min-h-0 rounded-xl bg-green-500 hover:bg-green-600 md:bg-green-600 md:hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                
                {loading ?
                <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Connexion...
                  </> :

                "Se connecter"
                }
              </button>

              {/* Forgot password link after submit button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-green-400 md:text-green-600 hover:underline">
                  
                  Mot de passe oublié ?
                </button>
              </div>

              <WhatsAppHelpCard className="" />
              <InstallAppButton />
            </div>
          )}
        </form>
      </AuthSplitLayout>
    </>);

}
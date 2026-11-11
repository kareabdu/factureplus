import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/auth/AppleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

function dest() {
  const r = safeReturnTo();
  return r === "/" ? "/app" : r;
}

export default function SsoButtons({ providers = ["google", "apple"] }) {
  const [loading, setLoading] = useState(null);

  const handle = async (provider) => {
    if (loading) return;
    setLoading(provider);
    if (typeof window.fbq === "function") window.fbq("track", "CompleteRegistration");
    try {
      await base44.auth.loginWithProvider(provider, dest());
    } catch {
      setLoading(null);
    }
  };

  const base =
    "h-9 !min-h-0 flex items-center justify-center gap-2.5 rounded-xl border border-green-400/70 bg-white/5 text-sm font-medium text-white hover:bg-white/10 hover:border-green-400 md:border-slate-200 md:bg-white md:text-slate-700 md:hover:bg-slate-50 md:hover:border-slate-300 active:scale-[0.99] transition-all disabled:opacity-60 disabled:pointer-events-none";

  const showGoogle = providers.includes("google");
  const showApple = providers.includes("apple");
  const single = [showGoogle, showApple].filter(Boolean).length === 1;

  return (
    <div className={single ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
      {showGoogle && (
        <button type="button" onClick={() => handle("google")} disabled={!!loading} className={base}>
          <GoogleIcon className="w-5 h-5" />
          <span>Continuer avec Google</span>
        </button>
      )}
      {showApple && (
        <button type="button" onClick={() => handle("apple")} disabled={!!loading} className={base}>
          <AppleIcon className="w-5 h-5 text-slate-900" />
          <span>Apple</span>
        </button>
      )}
    </div>
  );
}
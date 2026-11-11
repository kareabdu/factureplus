import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";

function detectAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent || "");
}

export default function InstallAppButton({ className = "", variant = "full" }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  const isAndroid = detectAndroid();

  useEffect(() => {
    const standalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch { /* ignore */ }
    setDeferredPrompt(null);
  };

  // Masqué sur web (desktop) et iOS ; raccourci d'installation natif sur Android
  if (installed || !isAndroid || !deferredPrompt) return null;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleInstall}
        aria-label="Installer l'application"
        className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500 shadow-lg active:scale-95 transition-transform !min-h-0 !min-w-0 ${className}`}>
        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-40" />
        <span className="absolute -inset-1 rounded-full bg-green-500/30 blur-md animate-pulse" />
        <Download className="relative w-7 h-7 text-white" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className={`w-full h-9 !min-h-0 rounded-xl border border-green-200 bg-green-50 text-green-700 font-medium text-sm hover:bg-green-100 transition-colors flex items-center justify-center gap-2 ${className}`}>
      <Download className="w-4 h-4" /> Installer l'application
    </button>
  );
}
import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, RefreshCw, CloudOff } from "lucide-react";

export default function AppUnavailable() {
  const { checkAppState } = useAuth();
  const [retrying, setRetrying] = React.useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await checkAppState();
    } finally {
      setTimeout(() => setRetrying(false), 600);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-background px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-green-100 flex items-center justify-center shadow-sm">
          <CloudOff className="w-10 h-10 text-green-700" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <img
            src="https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/494a02179_logo-vert-512.png"
            alt="StockTracker"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="font-bold text-xl text-foreground">StockTracker</span>
        </div>

        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
          Application indisponible
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Nous rencontrons un problème temporaire de connexion au service.
          Vérifiez votre connexion internet puis réessayez.
        </p>

        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold px-6 py-3 rounded-2xl shadow-sm transition-colors disabled:opacity-60"
        >
          {retrying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
          {retrying ? "Reconnexion…" : "Réessayer"}
        </button>

        <p className="mt-8 text-xs text-muted-foreground">
          Si le problème persiste, contactez le support StockTracker.
        </p>
      </div>
    </div>
  );
}
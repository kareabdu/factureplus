import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// Portail d'accès à la création de documents : ne truste plus le champ
// client subscription_status (modifiable via updateMe), mais la vérification
// serveur verifySubscription (paiement enregistré + date de fin valide).
export default function TrialGate({ children }) {
  const [state, setState] = useState({ loading: true, allow: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await base44.functions.invoke("verifySubscription", {});
        if (!mounted) return;
        const data = res?.data || {};
        if (data.error) {
          // En cas d'erreur serveur, on bloque par sécurité.
          setState({ loading: false, allow: false });
          return;
        }
        const allow = !!data.active || !!data.in_trial;
        setState({ loading: false, allow });
      } catch {
        if (mounted) setState({ loading: false, allow: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (state.loading) {
    return <div className="p-6 text-muted-foreground">Vérification de l'abonnement…</div>;
  }
  if (!state.allow) {
    return <Navigate to="/Subscription" replace />;
  }
  return children;
}
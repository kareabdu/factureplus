import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { isTeamOwner } from "@/lib/team";

// Restreint l'accès au propriétaire de l'équipe. Les membres non-propriétaires
// sont redirigés vers la page principale de l'application.
export default function OwnerGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    base44.auth.me().then((u) => {
      if (!mounted) return;
      setUser(u);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isTeamOwner(user)) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useTrialStatus } from "@/lib/trial";

export default function TrialBanner() {
  const { status, daysLeft, trialEnd, loading } = useTrialStatus();

  if (loading || status === "ok" || status === "active") return null;

  const expired = status === "expired";

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-sm ${
        expired ? "bg-red-600 text-white" : "bg-amber-500 text-white"
      }`}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">
        {expired
          ? "Votre période d'essai est terminée. Souscrivez pour continuer à créer des documents."
          : `Période d'essai : ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}${trialEnd ? ` (jusqu'au ${trialEnd.toLocaleDateString("fr-FR")})` : ""}.`}
      </span>
      <Link
        to="/Subscription"
        className="underline font-semibold whitespace-nowrap"
      >
        {expired ? "S'abonner" : "Voir les offres"}
      </Link>
    </div>
  );
}
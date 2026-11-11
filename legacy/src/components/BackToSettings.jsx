import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function BackToSettings() {
  return (
    <Link
      to="/Settings"
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      style={{ minHeight: "unset", minWidth: "unset" }}
    >
      <ChevronLeft className="w-4 h-4" />
      Retour aux paramètres
    </Link>
  );
}
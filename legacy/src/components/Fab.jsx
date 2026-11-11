import React from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";

/**
 * Bouton flottant "+" porté vers document.body afin de rester fixe
 * pendant les transitions de page (le conteneur animé applique un
 * transform qui sinon emprisonnerait les éléments position:fixed).
 */
export default function Fab({ onClick, ariaLabel = "Ajouter", className, style }) {
  return createPortal(
    <button
      onClick={onClick}
      className={className}
      style={style}
      aria-label={ariaLabel}
    >
      <Plus className="w-6 h-6 text-white" />
    </button>,
    document.body
  );
}
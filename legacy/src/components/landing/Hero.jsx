import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-28 pb-20 overflow-hidden bg-gradient-to-b from-green-50 via-background to-background">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-green-200/40 rounded-full blur-3xl" />
      <div className="absolute top-40 -left-24 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold mx-auto">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Gestion de stock & facturation
          </span>
          <h1 className="mt-5 font-heading text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Gérez votre stock, vos clients, fournisseurs en un seul endroit. Créez des documents et visualisez votre chiffre d'affaires en temps réel.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            StockTracker simplifie la gestion d'inventaire, la facturation et le suivi de vos ventes. Conçu pour les entreprises qui veulent gagner du temps.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-green-600/20 transition-colors">
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-green-50 border border-green-100 hover:bg-green-100 text-green-700 font-semibold px-6 py-3.5 rounded-xl transition-colors">
              Se connecter
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
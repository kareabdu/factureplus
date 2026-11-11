import React from "react";
import { Link } from "react-router-dom";

const LOGO = "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/494a02179_logo-vert-512.png";

export default function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            <img src={LOGO} alt="StockTracker" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-white text-lg">StockTracker</span>
          </div>
          <p className="mt-3 text-sm text-gray-400">La solution simple pour gérer stock, factures et équipe.</p>
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Produit</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="#features" className="hover:text-white">Fonctionnalités</a></li>
            <li><a href="#benefits" className="hover:text-white">Avantages</a></li>
            <li><Link to="/register" className="hover:text-white">S'inscrire</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Compte</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/login" className="hover:text-white">Connexion</Link></li>
            <li><Link to="/TermsOfService" className="hover:text-white">Conditions d'utilisation</Link></li>
            <li><Link to="/PrivacyPolicy" className="hover:text-white">Confidentialité</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Support</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/Subscription" className="hover:text-white">Abonnement</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-5 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} StockTracker. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
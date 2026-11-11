import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { appParams } from "@/lib/app-params";

const LOGO = "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/494a02179_logo-vert-512.png";

const TUTORIAL_URL = `${appParams.appBaseUrl || ""}/InventoryTutorial`;

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? "bg-background/95 backdrop-blur-md shadow-sm" : "bg-background/90 backdrop-blur md:bg-transparent md:backdrop-blur-none md:shadow-none"}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={LOGO} alt="StockTracker" className="w-9 h-9 rounded-lg" />
          <span className="font-bold text-lg text-foreground">StockTracker</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Fonctionnalités</a>
          <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground">Avantages</a>
          <a href="#demos" className="text-sm font-medium text-muted-foreground hover:text-foreground">Démos</a>
          <a href={TUTORIAL_URL} className="text-sm font-medium text-muted-foreground hover:text-foreground">Tutoriel inventaire</a>
          <Link to="/register" className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors">Essayer gratuitement</Link>
        </div>
        <button className="md:hidden p-2 -mr-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
        </button>
      </nav>
      {open && (
        <div className="md:hidden bg-card border-t border-border/60 px-4 py-4 space-y-3 shadow-lg">
          <a href="#features" onClick={() => setOpen(false)} className="block text-sm font-medium text-foreground">Fonctionnalités</a>
          <a href="#benefits" onClick={() => setOpen(false)} className="block text-sm font-medium text-foreground">Avantages</a>
          <a href="#demos" onClick={() => setOpen(false)} className="block text-sm font-medium text-foreground">Démos</a>
          <a href={TUTORIAL_URL} onClick={() => setOpen(false)} className="block text-sm font-medium text-foreground">Tutoriel inventaire</a>
          <Link to="/register" className="block text-center text-sm font-semibold text-white bg-green-600 px-4 py-2.5 rounded-lg">Essayer gratuitement</Link>
        </div>
      )}
    </header>
  );
}
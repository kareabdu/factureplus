import React from "react";
import {
  Package, FileText, Users, ArrowLeftRight, BarChart3, Wallet,
  MapPin, Receipt, Building2, PenTool, UsersRound, Gift,
} from "lucide-react";

const FEATURES = [
  { icon: Package, title: "Gestion de stock", desc: "Suivez vos quantités en temps réel et recevez des alertes de rupture automatiques.", color: "bg-green-100 text-green-600" },
  { icon: MapPin, title: "Multi-emplacement", desc: "Répartissez votre stock sur plusieurs emplacements et magasins avec un suivi par site.", color: "bg-emerald-100 text-emerald-600" },
  { icon: FileText, title: "Factures, devis & BL", desc: "Créez factures, proformas et bons de livraison professionnels, prêts à partager en un tap.", color: "bg-blue-100 text-blue-600" },
  { icon: Receipt, title: "Taxe & TVA", desc: "Gérez la TVA sur le total, en déduction ou par article, avec affichage automatique sur vos documents.", color: "bg-indigo-100 text-indigo-600" },
  { icon: Users, title: "Clients & acomptes", desc: "Centralisez vos clients et suivez les acomptes versés, imputés automatiquement sur les factures.", color: "bg-purple-100 text-purple-600" },
  { icon: Building2, title: "Fournisseurs", desc: "Associez plusieurs fournisseurs à chaque produit avec leurs références pour réapprovisionner vite.", color: "bg-cyan-100 text-cyan-600" },
  { icon: ArrowLeftRight, title: "Mouvements de stock", desc: "Traçabilité complète des entrées, sorties et ajustements avec historique détaillé.", color: "bg-amber-100 text-amber-600" },
  { icon: PenTool, title: "Signature & modèle", desc: "Personnalisez logo, couleur et modèle de facture, et ajoutez votre signature en un geste.", color: "bg-pink-100 text-pink-600" },
  { icon: BarChart3, title: "Tableau de bord", desc: "Visualisez vos ventes, votre stock et vos dépenses grâce à des analytics claires.", color: "bg-rose-100 text-rose-600" },
  { icon: Wallet, title: "Suivi des dépenses", desc: "Enregistrez vos dépenses par catégorie et gardez un œil sur la rentabilité de votre activité.", color: "bg-teal-100 text-teal-600" },
  { icon: UsersRound, title: "Équipe & activité", desc: "Invitez vos collaborateurs et suivez l'activité de chacun grâce au journal d'actions.", color: "bg-orange-100 text-orange-600" },
  { icon: Gift, title: "Parrainage rémunéré", desc: "Parrainez d'autres commerçants et touchez 5% de commission sur leur abonnement.", color: "bg-fuchsia-100 text-fuchsia-600" },
];

export default function Features() {
  return (
    <section id="features" className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Tout ce qu'il faut pour gérer votre activité</h2>
          <p className="mt-4 text-muted-foreground">Une suite complète d'outils pour piloter votre stock, vos ventes, vos clients et votre équipe, sans complexité.</p>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="group rounded-2xl border border-border/60 p-6 hover:shadow-lg hover:border-green-200 transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
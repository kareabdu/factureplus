import React from "react";
import { Check, Smartphone, Bell, Share2, ShieldCheck, CreditCard, Gift } from "lucide-react";

const BENEFITS = [
  { icon: Smartphone, title: "Accessible partout", desc: "Conçu pour mobile et desktop, gérez votre activité où que vous soyez." },
  { icon: Bell, title: "Alertes intelligentes", desc: "Soyez prévenu automatiquement avant la rupture de stock." },
  { icon: Share2, title: "Partage facile", desc: "Envoyez vos factures, devis et bons de livraison à vos clients en un tap." },
  { icon: ShieldCheck, title: "Vos données sécurisées", desc: "Vos informations sont protégées et accessibles uniquement par votre équipe." },
  { icon: CreditCard, title: "Paiement mobile", desc: "Réglez votre abonnement via Wave ou Orange Money, sans tracas." },
  { icon: Gift, title: "Parrainage rémunéré", desc: "Invitez d'autres commerçants et encaissez 5% de commission." },
];

export default function Showcase() {
  return (
    <section id="benefits" className="py-20 bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Conçu pour la réalité du terrain</h2>
          <p className="mt-4 text-muted-foreground">StockTracker répond aux besoins réels des commerçants et entreprises africaines : simplicité, rapidité et fiabilité.</p>
          <div className="mt-8 grid sm:grid-cols-2 gap-5 text-left">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{b.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <ul className="mt-6 space-y-2">
            {["100% en ligne", "Période d'essai sans engagement"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-green-500" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
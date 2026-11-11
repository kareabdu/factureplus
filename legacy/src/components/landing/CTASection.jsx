import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 to-emerald-700 px-8 py-14 text-center shadow-xl">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-white/10 rounded-full" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">Prêt à simplifier votre gestion ?</h2>
            <p className="mt-4 text-green-50 max-w-xl mx-auto">Rejoignez les entreprises qui gèrent leur stock sans effort. Lancez-vous gratuitement dès aujourd'hui.</p>
            <Link to="/register" className="mt-8 inline-flex items-center gap-2 bg-white text-green-700 font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-green-50 transition-colors">
              Créer mon compte gratuit <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
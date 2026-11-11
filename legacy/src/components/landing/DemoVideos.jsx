import React, { useState, useEffect, useCallback } from "react";
import { FileText, Truck, CheckCircle2, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

const STEPS = [
  {
    icon: FileText,
    title: "Liste des factures",
    description: "Sélectionnez une facture finalisée dans la liste.",
    image: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/508b3cd62_IMG_4495.jpg",
  },
  {
    icon: FileText,
    title: "Créer le bon de livraison",
    description: "Ouvrez le menu contextuel et choisissez « Créer un bon de livraison ».",
    image: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/95b5470ea_IMG_4496.jpg",
  },
  {
    icon: Truck,
    title: "Bon généré",
    description: "Le BL apparaît dans la liste des Bons avec le statut « En attente ».",
    image: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/48714c75b_IMG_4497.jpg",
  },
  {
    icon: Truck,
    title: "Marquer livré",
    description: "Ouvrez le BL et appuyez sur « Marquer livré » dans la barre d'actions.",
    image: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/cebb9dbb5_IMG_4498.jpg",
  },
  {
    icon: CheckCircle2,
    title: "Livré !",
    description: "Le statut passe à « Livré ». Vous pouvez annuler la livraison si besoin.",
    image: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/fa46dc4b6_IMG_4499.jpg",
  },
];

const AUTOPLAY_MS = 3500;

export default function DemoVideos() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % STEPS.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + STEPS.length) % STEPS.length);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [current, playing, next]);

  const step = STEPS[current];

  return (
    <section id="demos" className="py-16 sm:py-24 bg-gradient-to-b from-green-50 to-background scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-100 mb-4">
            <Truck className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            De la facture au bon de livraison
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Générez un bon de livraison depuis une facture, puis marquez-le « livré » :
            le stock est automatiquement déduit.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 items-center">
          {/* Slideshow */}
          <div className="order-1 lg:order-2 mx-auto w-full max-w-xs">
            <div className="relative overflow-hidden rounded-[2rem] bg-black shadow-2xl border-[6px] border-gray-900">
              <div className="aspect-[9/16] bg-black relative">
                {STEPS.map((s, i) => (
                  <img
                    key={i}
                    src={s.image}
                    alt={s.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                      i === current ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ))}
                {/* Step badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-green-600 text-white text-xs font-semibold">
                  Étape {current + 1}/{STEPS.length}
                </div>
                {/* Controls */}
                <div className="absolute bottom-3 inset-x-3 flex items-center gap-2">
                  <button
                    onClick={prev}
                    className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                    style={{ minHeight: "unset", minWidth: "unset" }}
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </button>
                  <div className="flex-1 flex gap-1">
                    {STEPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i === current ? "bg-green-500" : "bg-white/40"
                        }`}
                        style={{ minHeight: "unset", minWidth: "unset" }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                    style={{ minHeight: "unset", minWidth: "unset" }}
                  >
                    {playing ? (
                      <Pause className="w-4 h-4 text-foreground" />
                    ) : (
                      <Play className="w-4 h-4 text-foreground" />
                    )}
                  </button>
                  <button
                    onClick={next}
                    className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                    style={{ minHeight: "unset", minWidth: "unset" }}
                  >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Steps list */}
          <div className="order-2 lg:order-1 space-y-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === current;
              return (
                <button
                  key={s.title}
                  onClick={() => { setCurrent(i); setPlaying(false); }}
                  className={`w-full flex gap-4 p-3 rounded-xl text-left transition-colors ${
                    active ? "bg-green-100" : "hover:bg-muted/50"
                  }`}
                  style={{ minHeight: "unset", minWidth: "unset" }}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      active ? "bg-green-600 text-white" : "bg-green-100 text-green-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${active ? "text-green-700" : "text-foreground"}`}>
                      {s.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
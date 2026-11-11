import React, { useState, useEffect, useCallback } from "react";

// Étapes successives de création d'une facture (captures fournies)
const STEPS = [
  {
    img: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/32c41abc6_IMG_5527.png",
    title: "Vos factures",
    caption: "Liste des factures, toujours à portée de main."
  },
  {
    img: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/6b2427d8b_IMG_5528.png",
    title: "Nouvelle facture",
    caption: "Créez une facture en quelques secondes."
  },
  {
    img: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/c723a2cb6_IMG_5530.png",
    title: "Choix du client",
    caption: "Sélectionnez ou créez un client instantanément."
  },
  {
    img: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/30bd937dc_IMG_5531.png",
    title: "Client ajouté",
    caption: "Les coordonnées du client sont rattachées."
  },
  {
    img: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/5e4ade34d_IMG_5532.png",
    title: "Ajout d'un article",
    caption: "Prix, quantité et total calculés automatiquement."
  },
  {
    img: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/e34e7d476_IMG_5533.png",
    title: "Date d'échéance",
    caption: "Choisissez la date d'échéance en un geste."
  },
  {
    img: "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/5ada575db_IMG_5534.png",
    title: "Facture terminée",
    caption: "Validez, partagez ou convertissez en bon de livraison."
  }
];

const STEP_MS = 2600;

export default function TutorialCarousel() {
  const [idx, setIdx] = useState(0);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % STEPS.length);
  }, []);

  useEffect(() => {
    const t = setInterval(next, STEP_MS);
    return () => clearInterval(t);
  }, [next]);

  const step = STEPS[idx];

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Image */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {STEPS.map((s, i) => (
          <img
            key={i}
            src={s.img}
            alt={s.title}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === idx ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {/* Dégradé bas pour lisibilité de la légende */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
        {/* Légende */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2 text-white">
          <p className="text-[11px] font-semibold leading-tight">{step.title}</p>
          <p className="text-[10px] text-white/80 leading-tight mt-0.5 line-clamp-2">{step.caption}</p>
        </div>
      </div>

      {/* Points de progression */}
      <div className="flex items-center justify-center gap-1.5 py-2 bg-black/30">
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Étape ${i + 1}`}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === idx ? "w-5 bg-emerald-400" : "w-1.5 bg-white/40"
            }`}
            style={{ minHeight: "unset", minWidth: "unset" }}
          />
        ))}
      </div>
    </div>
  );
}
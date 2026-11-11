import React from "react";
import { Smartphone } from "lucide-react";

const VIDEOS = [
  {
    title: "Installation sur Android",
    src: "https://media.base44.com/videos/public/6a3b047b6054a9a30af8781d/acaaf0467_InstallationsurAndroid.MOV",
  },
  {
    title: "Installation sur iPhone",
    src: "https://media.base44.com/videos/public/6a3b047b6054a9a30af8781d/a5771674b_InstallationsuriPhone.MP4",
  },
];

export default function InstallVideos() {
  return (
    <section className="py-16 sm:py-24 bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-100 mb-4">
            <Smartphone className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Installez StockTracker sur votre téléphone
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Suivez le guide d'installation en vidéo, sur Android comme sur iPhone.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          {VIDEOS.map((v) => (
            <div key={v.title} className="overflow-hidden rounded-2xl bg-card shadow-sm border border-border/60">
              <div className="aspect-[9/16] bg-black">
                <video
                  src={v.src}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground">{v.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
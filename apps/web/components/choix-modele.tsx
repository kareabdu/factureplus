"use client";

import {
  COULEURS_DOCUMENT, documentExemple, estCouleurValide, htmlDocument, MODELES_DOCUMENT, type ModeleDocument, type Parametres,
} from "@stocktracker/core";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Choix du modèle de facture et de sa couleur, avec un vrai aperçu (facture d'exemple rendue
 * avec le même gabarit que l'impression et le PDF mobile).
 */
export function ChoixModele({ modele, couleur, parametres, onChange }: {
  modele: ModeleDocument;
  couleur: string;
  parametres: Parametres;
  onChange: (c: { modele?: ModeleDocument; couleur?: string }) => void;
}) {
  const [saisie, setSaisie] = useState(couleur);
  const accent = estCouleurValide(couleur) ? couleur : "#147A2E";
  const exemple = useMemo(() => documentExemple(parametres), [parametres]);
  const apercu = (m: ModeleDocument) => htmlDocument({ ...exemple, parametres, modele: m, couleur: accent });

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Modèle de facture" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MODELES_DOCUMENT.map((mo) => {
          const choisi = mo.code === modele;
          return (
            <button key={mo.code} type="button" role="radio" aria-checked={choisi} onClick={() => onChange({ modele: mo.code })}
              className={`flex flex-col gap-2 rounded-xl border p-2 text-left transition-colors hover:bg-surface-retrait ${choisi ? "border-2" : "border-border"}`}
              style={choisi ? { borderColor: accent } : undefined}>
              {/* Miniature : la page A4 réelle, réduite */}
              <PageReduite html={apercu(mo.code)} titre={`Aperçu du modèle ${mo.libelle}`} miniature />
              <span className="text-sm font-medium">{choisi ? "✓ " : ""}{mo.libelle}</span>
              <span className="text-xs text-muted">{mo.description}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Couleur</span>
        <div className="flex flex-wrap items-center gap-2">
          {COULEURS_DOCUMENT.map((c) => {
            const choisie = c.toLowerCase() === accent.toLowerCase();
            return (
              <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={choisie}
                onClick={() => { setSaisie(c); onChange({ couleur: c }); }}
                className={`size-8 rounded-full ring-offset-2 ring-offset-surface ${choisie ? "ring-2 ring-foreground" : ""}`}
                style={{ backgroundColor: c }} />
            );
          })}
          <label className="ml-1 flex items-center gap-2 text-sm text-muted">
            <input type="color" value={accent} aria-label="Couleur personnalisée"
              onChange={(e) => { setSaisie(e.target.value.toUpperCase()); onChange({ couleur: e.target.value.toUpperCase() }); }}
              className="size-8 cursor-pointer rounded border border-border bg-surface" />
            <input value={saisie} maxLength={7} aria-label="Code couleur" spellCheck={false}
              onChange={(e) => {
                const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                setSaisie(v);
                if (estCouleurValide(v)) onChange({ couleur: v.toUpperCase() });
              }}
              className={`h-8 w-24 rounded-lg border bg-surface px-2 font-mono text-sm text-foreground ${estCouleurValide(saisie) ? "border-border" : "border-danger"}`} />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Aperçu</span>
        <div className="overflow-hidden rounded-xl border border-border bg-surface-retrait p-3">
          <div className="mx-auto w-full max-w-[460px]">
            <PageReduite html={apercu(modele)} titre="Aperçu de la facture" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Page A4 (794 × 1123 px) rendue dans un iframe puis réduite à la largeur disponible. */
function PageReduite({ html, titre, miniature = false }: { html: string; titre: string; miniature?: boolean }) {
  const cadre = useRef<HTMLSpanElement>(null);
  const [echelle, setEchelle] = useState(0.25);
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const observateur = new ResizeObserver(([e]) => setEchelle(e.contentRect.width / 794));
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);
  return (
    <span ref={cadre} className="relative block aspect-[210/297] w-full overflow-hidden rounded bg-white shadow-sm ring-1 ring-border">
      <iframe title={titre} srcDoc={html} tabIndex={miniature ? -1 : undefined} aria-hidden={miniature || undefined}
        className={`absolute left-0 top-0 origin-top-left border-0 ${miniature ? "pointer-events-none" : ""}`}
        style={{ width: 794, height: 1123, transform: `scale(${echelle})` }} />
    </span>
  );
}

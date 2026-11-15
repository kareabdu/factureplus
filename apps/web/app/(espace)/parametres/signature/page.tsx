"use client";

import { envoyerImageProduit, modifierParametres, signatureVide, svgSignature, type Trait } from "@factureplus/core";
import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { Icone } from "@/components/icones";
import { Alerte, Carte, Chargement, EnTetePage } from "@/components/ui";
import { useEquipe } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

const DELAI_ENREGISTREMENT = 2500;
const ENCRE = "#111827";

/**
 * Signature des factures (comme l'ancienne application) : dessinée ou importée (image / cachet).
 * Enregistrée automatiquement, imprimée en bas des factures.
 */
export default function PageSignature() {
  const { equipeId, parametres, rafraichir } = useEquipe();
  const [mode, setMode] = useState<"dessin" | "image">("dessin");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ type: "erreur" | "succes"; texte: string } | null>(null);
  const paveRef = useRef<{ vider: () => void } | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current); }, []);
  if (!parametres) return <Chargement />;
  const signature = parametres.signature_url;

  async function enregistrer(contenu: Blob, type: string) {
    setEnvoi(true);
    setMessage(null);
    try {
      const url = await envoyerImageProduit(supabase, equipeId, contenu, type);
      await modifierParametres(supabase, equipeId, { signature_url: url });
      await rafraichir();
      paveRef.current?.vider();
      setMessage({ type: "succes", texte: "Signature enregistrée." });
    } catch (e) {
      setMessage({ type: "erreur", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  function programmer(traits: Trait[]) {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => {
      const svg = svgSignature(traits);
      if (svg && !signatureVide(traits)) void enregistrer(new Blob([svg], { type: "image/svg+xml" }), "image/svg+xml");
    }, DELAI_ENREGISTREMENT);
  }

  async function supprimer() {
    if (minuterie.current) clearTimeout(minuterie.current);
    paveRef.current?.vider();
    try {
      await modifierParametres(supabase, equipeId, { signature_url: null });
      await rafraichir();
      setMessage(null);
    } catch (e) {
      setMessage({ type: "erreur", texte: (e as Error).message });
    }
  }

  const bouton = (actif: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
      actif ? "border-primary bg-primary text-on-primary" : "border-border bg-surface hover:bg-surface-retrait"}`;

  return (
    <div className="max-w-2xl">
      <Link href="/parametres" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">← Retour aux paramètres</Link>
      <EnTetePage titre="Signature" />
      <Carte titre="Signature des factures">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Dessinez ou insérez une image (cachet). Votre signature sera ajoutée automatiquement en bas de vos factures.
          </p>
          {message && <Alerte type={message.type}>{message.texte}</Alerte>}

          {signature && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature} alt="Signature actuelle" className="h-16 max-w-[70%] object-contain" />
              <button type="button" onClick={() => void supprimer()}
                className="inline-flex items-center gap-1 rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger hover:bg-danger-soft">
                <Icone nom="supprimer" taille={16} /> Supprimer
              </button>
            </div>
          )}

          <div className="flex gap-2" role="radiogroup" aria-label="Type de signature">
            <button type="button" role="radio" aria-checked={mode === "dessin"} onClick={() => setMode("dessin")} className={bouton(mode === "dessin")}>
              <Icone nom="modifier" taille={16} /> Dessiner
            </button>
            <button type="button" role="radio" aria-checked={mode === "image"} onClick={() => setMode("image")} className={bouton(mode === "image")}>
              <Icone nom="recu" taille={16} /> Image / Cachet
            </button>
          </div>

          {mode === "dessin" ? (
            <div>
              <p className="mb-2 text-sm font-medium">Dessinez votre signature</p>
              <PaveSignature paveRef={paveRef} onFin={programmer} />
              <div className="mt-3 flex items-center justify-between">
                <button type="button" onClick={() => { if (minuterie.current) clearTimeout(minuterie.current); paveRef.current?.vider(); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-retrait">
                  <Icone nom="supprimer" taille={16} /> Effacer
                </button>
                <span className="text-xs text-muted">{envoi ? "Enregistrement…" : "Sauvegarde automatique"}</span>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium">Insérer une image (cachet)</p>
              <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:bg-surface-retrait">
                <Icone nom="importer" taille={24} className="text-muted" />
                <span className="text-sm text-muted">{envoi ? "Envoi…" : "Cliquez pour téléverser une image"}</span>
                <span className="text-xs text-muted">PNG ou JPG</span>
                <input type="file" accept="image/*" className="sr-only" disabled={envoi}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void enregistrer(f, f.type || "image/png"); e.target.value = ""; }} />
              </label>
            </div>
          )}
        </div>
      </Carte>
    </div>
  );
}

/** Pavé de dessin (souris, stylet ou doigt) : garde les traits pour produire l'image SVG. */
function PaveSignature({ paveRef, onFin }: { paveRef: { current: { vider: () => void } | null }; onFin: (traits: Trait[]) => void }) {
  const toile = useRef<HTMLCanvasElement>(null);
  const traits = useRef<Trait[]>([]);
  const dessine = useRef(false);

  useEffect(() => {
    const c = toile.current!;
    const ratio = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = Math.max(1, Math.round(r.width * ratio));
    c.height = Math.max(1, Math.round(r.height * ratio));
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = ENCRE;
    paveRef.current = {
      vider: () => { traits.current = []; ctx.clearRect(0, 0, r.width, r.height); },
    };
    return () => { paveRef.current = null; };
  }, [paveRef]);

  const position = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = toile.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function debut(e: PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    toile.current!.setPointerCapture(e.pointerId);
    dessine.current = true;
    const p = position(e);
    traits.current.push([p]);
    const ctx = toile.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.25, 0, Math.PI * 2);
    ctx.fillStyle = ENCRE;
    ctx.fill();
  }

  function deplacement(e: PointerEvent<HTMLCanvasElement>) {
    if (!dessine.current) return;
    e.preventDefault();
    const p = position(e);
    const trait = traits.current[traits.current.length - 1];
    const precedent = trait[trait.length - 1];
    trait.push(p);
    const ctx = toile.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(precedent.x, precedent.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function fin() {
    if (!dessine.current) return;
    dessine.current = false;
    onFin(traits.current.map((t) => t.slice()));
  }

  return (
    <canvas ref={toile} aria-label="Zone de signature"
      className="h-44 w-full cursor-crosshair touch-none rounded-xl border border-border bg-white"
      onPointerDown={debut} onPointerMove={deplacement} onPointerUp={fin} onPointerCancel={fin} />
  );
}

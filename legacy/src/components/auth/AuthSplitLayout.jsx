import React, { useState, useEffect, useRef } from "react";
import HolographicWidget from "@/components/auth/HolographicWidget";

const MOBILE_BP = 1024;

const LOGO_URL =
  "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/494a02179_logo-vert-512.png";

const TUTORIAL_VIDEO_URL =
  "https://media.base44.com/videos/public/6a3b047b6054a9a30af8781d/049899688_RPReplay_Final1790753252.mov";

export default function AuthSplitLayout({ title, subtitle, footer, children }) {
  const videoRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() =>
  typeof window !== "undefined" ? window.innerWidth < MOBILE_BP : false
  );

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.play().catch(() => {});
    }
  }, [isMobile]);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (isMobile) {
    return (
      <div
        className="h-dvh w-full flex flex-col overflow-hidden relative"
        style={{ background: "radial-gradient(circle at 25% 75%, #d2f5e3 0%, #e6f8ee 35%, #f4fcf7 65%, #ffffff 100%)" }}>

        {/* Décor : orbes verts flous */}
        <div className="absolute top-1/4 left-1/4 w-[22rem] h-[22rem] rounded-full bg-green-300/20 blur-3xl pointer-events-none" />
        <div className="absolute top-6 right-6 w-40 h-40 rounded-full bg-green-200/20 blur-2xl pointer-events-none" />
        

        {/* Zone haute : logo + titre + vidéo tutorielle */}
        <div
          className="relative flex-1 flex flex-col items-center justify-center px-5 min-h-0"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}>
          
          <div className="flex flex-col items-center gap-2 mb-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md ring-1 ring-white/40">
              <img src={LOGO_URL} alt="StockTracker" className="w-full h-full object-cover" />
            </div>
            <span className="text-base font-bold text-[#1C1C1C] tracking-tight [font-family:'Open_Sans',_sans-serif]">StockTracker</span>
          </div>

          



          
          {subtitle &&
          <p className="text-xs text-[#1C1C1C]/70 text-center mt-1 max-w-[16rem]">{subtitle}</p>
          }

          {/* Cadre téléphone avec tutoriel de création de facture */}
          <div className="mt-3 w-[min(62vw,200px)] rounded-[24px] p-1.5 bg-white/15 ring-1 ring-white/25 shadow-xl">
            <div className="relative w-full rounded-[18px] overflow-hidden bg-black aspect-[9/16]">
              <video
                ref={videoRef}
                src={TUTORIAL_VIDEO_URL}
                autoPlay
                muted
                loop
                playsInline
                webkit-playsinline="true"
                controls={false}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Feuille sombre ancrée en bas (style Material) */}
        <div
          className="auth-mobile-sheet relative bg-[#0C1F15] rounded-t-[24px] shadow-2xl flex flex-col flex-shrink-0"
          style={{ maxHeight: "62vh", paddingBottom: "env(safe-area-inset-bottom)" }}>
          
          {/* Poignée */}
          <div className="flex justify-center pt-2.5 pb-1">
            <span className="block w-10 h-1 rounded-full bg-white/30" />
          </div>

          <div className="overflow-y-auto px-5 pt-1 pb-5 no-scrollbar">
            <div className="max-w-md mx-auto w-full">
            {children}
            {footer &&
            <p className="text-center text-sm text-white/70 mt-3">{footer}</p>
            }
            </div>
          </div>
        </div>
      </div>);

  }

  // ───────────── DESKTOP ─────────────
  return (
    <div
      className="h-dvh w-full overflow-hidden relative grid grid-cols-2"
      style={{ background: "radial-gradient(circle at 25% 75%, #d2f5e3 0%, #e6f8ee 35%, #f4fcf7 65%, #ffffff 100%)" }}>
      
      {/* Decorative blurred orbs */}
      <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] rounded-full bg-green-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-green-200/20 blur-3xl pointer-events-none" />

      {/* Left: Holographic widget */}
      <div className="relative flex items-center justify-center p-10 xl:p-16">
        <HolographicWidget />
      </div>

      {/* Right: Form area */}
      <div className="flex flex-col h-dvh overflow-hidden">
        <div className="flex-1 flex items-center justify-center px-5 py-6 lg:pt-16 lg:pb-16 lg:px-16 overflow-y-auto">
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center gap-2.5 mb-10">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md ring-1 ring-green-200">
                <img src={LOGO_URL} alt="StockTracker" className="w-full h-full object-cover" />
              </div>
              
              <div className="w-16 h-px bg-slate-200 mt-1" />
            </div>

            {(title || subtitle) &&
            <div className="mb-6 text-center">
                
                {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
              </div>
            }
            {children}
            {footer && <p className="text-center text-sm text-slate-500">{footer}</p>}
          </div>
        </div>
      </div>
    </div>);

}
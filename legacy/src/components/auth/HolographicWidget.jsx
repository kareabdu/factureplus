import React from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, Boxes, AlertTriangle } from "lucide-react";

const LOGO_URL =
"https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/494a02179_logo-vert-512.png";

export default function HolographicWidget() {
  return (
    <motion.div
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: [0, -10, 0], opacity: 1 }}
      transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.6 } }}
      className="relative w-full max-w-lg">

      {/* Main glass container */}
      <div className="relative rounded-[2rem] border border-white/70 bg-white/40 backdrop-blur-2xl shadow-[0_24px_70px_-20px_rgba(7,164,63,0.35)] p-7 overflow-hidden">
        {/* Circuit decoration — top right */}
        <svg className="absolute top-0 right-0 w-44 h-44 opacity-25 pointer-events-none" viewBox="0 0 176 176" fill="none">
          <path d="M176 0 L176 48 L128 48 L128 96 L88 96" stroke="#07a43f" strokeWidth="1" />
          <circle cx="176" cy="48" r="3" fill="#07a43f" />
          <circle cx="128" cy="96" r="3" fill="#07a43f" />
          <path d="M128 48 L176 48" stroke="#47bf6c" strokeWidth="0.5" strokeDasharray="2 3" />
        </svg>
        {/* Circuit decoration — bottom left */}
        <svg className="absolute bottom-0 left-0 w-40 h-40 opacity-20 pointer-events-none" viewBox="0 0 160 160" fill="none">
          <path d="M0 160 L48 160 L48 112 L88 112" stroke="#07a43f" strokeWidth="1" />
          <circle cx="48" cy="160" r="3" fill="#07a43f" />
          <circle cx="88" cy="112" r="3" fill="#07a43f" />
        </svg>

        {/* Header */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md ring-1 ring-green-200">
              <img src={LOGO_URL} alt="StockTracker" className="w-full h-full object-cover" />
            </div>
            <span className="text-slate-700 text-sm font-semibold tracking-tight">StockTracker</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Data Overview label */}
        <p className="text-green-500/70 text-[11px] uppercase tracking-[0.25em] font-semibold mb-3">Data Overview</p>

        {/* Big numbers */}
        <div className="flex items-end gap-8 mb-7">
          <div>
            <p className="text-5xl font-bold text-slate-800 tabular-nums tracking-tight leading-none">4203</p>
            <p className="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
              <Boxes className="w-3 h-3" /> Products
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-600 tabular-nums tracking-tight leading-none">124</p>
            <p className="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Alerts
            </p>
          </div>
        </div>

        {/* Radar + progress bars */}
        <div className="flex items-center gap-6">
          {/* Radar circle */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-green-300/40" />
            <div className="absolute inset-[10px] rounded-full border border-green-300/30" />
            <div className="absolute inset-[22px] rounded-full border border-green-300/20" />
            {/* Rotating scan */}
            <div className="absolute inset-0 rounded-full animate-spin" style={{ animationDuration: "3s", background: "conic-gradient(from 0deg, transparent 0deg, rgba(7,164,63,0.25) 50deg, transparent 100deg)" }} />
            {/* Cross hairs */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-green-300/25 -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-300/25 -translate-x-1/2" />
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
            </div>
          </div>

          {/* Mini progress stats */}
          <div className="flex-1 space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">Ventes</span>
                <span className="text-[11px] text-green-600 font-semibold">+24%</span>
              </div>
              <div className="h-1.5 rounded-full bg-green-100/80 overflow-hidden">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-green-400 to-green-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">Stock</span>
                <span className="text-[11px] text-green-600 font-semibold">86%</span>
              </div>
              <div className="h-1.5 rounded-full bg-green-100/80 overflow-hidden">
                <div className="h-full w-5/6 rounded-full bg-gradient-to-r from-green-400 to-green-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">Revenu</span>
                <span className="text-[11px] text-green-600 font-semibold">+12%</span>
              </div>
              <div className="h-1.5 rounded-full bg-green-100/80 overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-green-300 to-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom activity bar */}
        <div className="mt-6 pt-4 border-t border-green-200/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[11px] text-slate-500">Sync temps réel</span>
          </div>
          <div className="flex items-end gap-0.5 h-5">
            {[40, 65, 50, 80, 60, 90, 70, 55].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-green-400/60" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Floating accent card — top right */}
      <div className="absolute -top-4 -right-3 rounded-2xl border border-white/70 bg-white/50 backdrop-blur-xl shadow-lg px-3 py-2 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-green-600" />
        <span className="text-[11px] font-semibold text-slate-700">+18.2%</span>
      </div>

      {/* Floating accent card — bottom left */}
      <div className="absolute -bottom-3 -left-3 rounded-2xl border border-white/70 bg-white/50 backdrop-blur-xl shadow-lg px-3 py-2">
        <p className="text-[10px] text-slate-500">Aujourd'hui</p>
        <p className="text-sm font-bold text-slate-800 leading-tight">1,284</p>
      </div>
    </motion.div>
  );
}
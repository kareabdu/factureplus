import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

const WHATSAPP_NUMBER = "221778339771";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Bonjour, je souhaite une session de formation gratuite sur StockTracker."
)}`;

const MESSAGES = [
  "Contactez-nous pour une session de formation gratuite",
  "Jokkoo leen ak ñun ngir am tàggat bu gaaw te doo fay",
];

export default function WhatsAppHelpCard({ className = "mx-4 mb-4" }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`hidden md:flex items-center gap-3 ${className}`}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white rounded-2xl shadow-xl ring-1 ring-black/5 px-4 py-3 max-w-xs">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center !min-h-0 !min-w-0"
              aria-label="Fermer">
              <X className="w-3 h-3 text-slate-600" />
            </button>
            <AnimatePresence mode="wait">
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="text-xs text-slate-600 font-medium leading-snug">
                {MESSAGES[index]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Aide WhatsApp"
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen(false)}
        className="relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-105 active:scale-95 !min-h-0 !min-w-0">
        {/* Halo scintillant */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-40" />
        <span className="absolute -inset-1 rounded-full bg-[#25D366]/30 blur-md animate-pulse" />
        <MessageCircle className="relative w-6 h-6 text-white" fill="white" strokeWidth={0} />
      </a>
    </div>
  );
}
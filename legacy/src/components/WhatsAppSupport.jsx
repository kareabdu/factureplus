import React from "react";
import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "221778339771";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Bonjour, j'ai besoin d'aide concernant StockTracker."
)}`;

export default function WhatsAppSupport({ label = "Besoin d'aide ? Contactez-nous sur WhatsApp" }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
    >
      <MessageCircle className="w-4 h-4" />
      {label}
    </a>
  );
}
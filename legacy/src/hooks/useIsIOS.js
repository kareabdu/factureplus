import { useState, useEffect } from "react";

// Détecte les appareils iOS (iPhone, iPad, iPod) pour utiliser les sélecteurs natifs.
export default function useIsIOS() {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Mac") && "ontouchend" in document);
    setIsIOS(isIOSDevice);
  }, []);

  return isIOS;
}
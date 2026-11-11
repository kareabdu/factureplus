import { useState, useEffect } from "react";

// Détecte les appareils mobiles (iOS et Android) pour utiliser les sélecteurs natifs.
export default function useNativeMobilePicker() {
  const [useNative, setUseNative] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Mac") && "ontouchend" in document);
    const isAndroid = /Android/i.test(ua);
    setUseNative(isIOS || isAndroid);
  }, []);

  return useNative;
}
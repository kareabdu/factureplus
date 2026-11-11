import { useState, useEffect } from "react";

// Détecte les appareils Android pour utiliser les feuilles natives Material.
export default function useIsAndroid() {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    const isAndroidDevice = /Android/i.test(ua) && !/Windows Phone/i.test(ua);
    setIsAndroid(isAndroidDevice);
  }, []);

  return isAndroid;
}
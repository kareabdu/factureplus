import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";

// Déconnexion automatique après une période d'inactivité (défaut : 15 min).
const DEFAULT_TIMEOUT = 15 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "click",
  "scroll",
];

export default function useInactivityLogout(timeoutMs = DEFAULT_TIMEOUT) {
  const { isAuthenticated, logout } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout(true);
      }, timeoutMs);
    };

    resetTimer();

    const opts = { passive: true };
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, resetTimer, opts)
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuthenticated, timeoutMs, logout]);
}
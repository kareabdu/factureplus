import { useState, useEffect, useRef } from "react";

export default function usePullToRefresh(onRefresh, containerRef) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const startX = useRef(null);
  const pullDistanceRef = useRef(0);
  const THRESHOLD = 70;
  const DEADZONE = 8;

  useEffect(() => { pullDistanceRef.current = pullDistance; }, [pullDistance]);

  useEffect(() => {
    // Désactivé : aucun callback (pages éditeur) -> on n'attache aucun
    // écouteur tactile pour ne pas interférer avec le swipe-to-back natif.
    if (!onRefresh) return;
    // Find the actual scrollable ancestor (the Layout scroll container),
    // not the page root (which isn't scrollable itself).
    const findScroller = () => {
      let el = containerRef?.current?.parentElement;
      while (el) {
        if (/(auto|scroll)/.test(window.getComputedStyle(el).overflowY)) return el;
        el = el.parentElement;
      }
      return null;
    };
    const scroller = findScroller();
    // Pas de conteneur défilable identifié -> on désactive le pull-to-refresh
    // pour éviter de capturer le défilement natif (window.scrollY reste ~ 0).
    if (!scroller) return;
    const getScrollTop = () => scroller.scrollTop;

    const onTouchStart = (e) => {
      if (getScrollTop() <= 0) {
        startY.current = e.touches[0].clientY;
        startX.current = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      const dx = e.touches[0].clientX - (startX.current || 0);
      // Ne capturer que les gestes verticaux vers le bas, au sommet de la liste.
      if (dy > 0 && getScrollTop() <= 0 && Math.abs(dy) > Math.abs(dx)) {
        if (dy > DEADZONE) e.preventDefault();
        setPulling(true);
        setPullDistance(Math.min(dy * 0.5, THRESHOLD + 20));
      } else if (dy <= 0) {
        // L'utilisateur remonte : on libère le geste pour le défilement natif.
        setPulling(false);
        setPullDistance(0);
        startY.current = null;
        startX.current = null;
      }
    };

    const onTouchEnd = async () => {
      if (pullDistanceRef.current >= THRESHOLD) {
        setRefreshing(true);
        try { await onRefresh(); } finally { setRefreshing(false); }
      }
      setPulling(false);
      setPullDistance(0);
      startY.current = null;
      startX.current = null;
    };

    const target = containerRef?.current || window;
    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: false });
    target.addEventListener("touchend", onTouchEnd);

    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, containerRef]);

  return { pulling, pullDistance, refreshing, threshold: THRESHOLD };
}
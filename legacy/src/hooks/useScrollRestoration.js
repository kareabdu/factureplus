import { useEffect, useRef } from "react";

// Mémorise la position de défilement de chaque page (par pathname) et la
// restaure au retour, afin de rester sur l'élément précédemment sélectionné
// plutôt que de revenir en début de liste. La restauration utilise
// requestAnimationFrame pour repositionner le défilement dès que le contenu
// est assez grand, sans délai artificiel ni blocage de l'écran.
export default function useScrollRestoration(scrollRef, pathname) {
  const scrollMap = useRef(new Map());
  const currentPath = useRef(pathname);

  // Enregistre la position courante pendant le défilement.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      scrollMap.current.set(currentPath.current, el.scrollTop);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  // Au changement de page : sauvegarde l'ancienne position, puis restaure
  // celle mémorisée pour la nouvelle page dès que le contenu est prêt.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prev = currentPath.current;
    if (prev !== pathname) {
      scrollMap.current.set(prev, el.scrollTop);
      currentPath.current = pathname;
    }
    const saved = scrollMap.current.get(pathname) || 0;
    if (!saved) return undefined;
    let raf;
    let tries = 0;
    const restore = () => {
      const e = scrollRef.current;
      if (!e) return;
      // Couvre la transition AnimatePresence mode="wait" (~560 ms) +
      // le chargement asynchrone des données, sans bloquer le thread principal.
      if (e.scrollHeight >= saved || tries > 60) {
        e.scrollTop = saved;
        return;
      }
      tries++;
      raf = requestAnimationFrame(restore);
    };
    raf = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(raf);
  }, [pathname, scrollRef]);
}
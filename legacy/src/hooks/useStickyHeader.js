import { useEffect, useRef, useState } from "react";

/**
 * Tracks a sticky header's height (so year sub-headers can stack below it)
 * and scrolls the nearest scrollable ancestor to top on mount — so returning
 * from a document editor always shows the start of the list.
 *
 * Returns [headerRef, headerHeight].
 */
export default function useStickyHeader() {
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let el = headerRef.current;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        el.scrollTop = 0;
        break;
      }
      el = el.parentElement;
    }
  }, []);

  return [headerRef, headerHeight];
}
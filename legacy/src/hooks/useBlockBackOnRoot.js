import { useEffect } from "react";

/**
 * On root pages (no detail/child page open), block the iOS swipe-back gesture so
 * the user does not leave the app. On child/detail pages the guard is inactive,
 * so swipe-back returns to the root page normally.
 *
 * The guard pushes a dummy history entry on root pages. When the user swipes
 * back, the browser pops the guard and lands on the previous entry (same URL) —
 * React Router re-renders the same page, and we re-push the guard.
 *
 * iOS freeze fix: all pushState calls are deferred via setTimeout(…, 0) so they
 * run AFTER the native swipe-back animation finishes, instead of interrupting
 * the WKWebView transition mid-gesture (which froze the screen).
 */
export default function useBlockBackOnRoot(isRoot, pageKey) {
  useEffect(() => {
    if (!isRoot) return;

    const pushGuard = () => {
      window.history.pushState({ guard: true }, "");
    };

    // Push the guard shortly after mount (deferred so it never collides with
    // an in-flight swipe gesture triggered by the navigation itself).
    const mountTimer = setTimeout(pushGuard, 0);

    const onPop = () => {
      // Re-push the guard on the next tick — the swipe animation has already
      // completed by then, so pushState no longer freezes the renderer.
      setTimeout(pushGuard, 0);
    };

    window.addEventListener("popstate", onPop);
    return () => {
      clearTimeout(mountTimer);
      window.removeEventListener("popstate", onPop);
    };
  }, [isRoot, pageKey]);
}
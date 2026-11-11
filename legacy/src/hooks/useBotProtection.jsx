import { useRef, useState, useCallback } from "react";

const ATTEMPT_KEY = "stk_bot_attempts";
const LOCK_KEY = "stk_bot_lock";
const MIN_SUBMIT_MS = 2500; // bots submit instantly; humans take longer
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000; // lock for 1 minute after too many failures

function readLock() {
  try {
    const raw = sessionStorage.getItem(LOCK_KEY);
    if (!raw) return 0;
    const until = parseInt(raw, 10);
    if (Date.now() >= until) {
      sessionStorage.removeItem(LOCK_KEY);
      return 0;
    }
    return until;
  } catch {
    return 0;
  }
}

function readAttempts() {
  try {
    return parseInt(sessionStorage.getItem(ATTEMPT_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

/**
 * Lightweight client-side bot protection:
 * - Honeypot: a hidden field bots tend to fill; humans never see it.
 * - Time trap: reject submissions faster than MIN_SUBMIT_MS (bots auto-fill instantly).
 * - Rate limiting: after MAX_ATTEMPTS failures, lock submissions for LOCK_MS.
 */
export function useBotProtection() {
  const mountedAt = useRef(Date.now());
  const [honeypot, setHoneypot] = useState("");
  const [lockedUntil, setLockedUntil] = useState(readLock);

  const check = useCallback(() => {
    // honeypot must remain empty
    if (honeypot) return { ok: false, reason: "bot" };
    // time trap
    if (Date.now() - mountedAt.current < MIN_SUBMIT_MS) return { ok: false, reason: "too_fast" };
    // rate limit
    const lock = readLock();
    if (lock) {
      setLockedUntil(lock);
      return { ok: false, reason: "locked" };
    }
    return { ok: true };
  }, [honeypot]);

  const recordFailure = useCallback(() => {
    const n = readAttempts() + 1;
    sessionStorage.setItem(ATTEMPT_KEY, String(n));
    if (n >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCK_MS;
      sessionStorage.setItem(LOCK_KEY, String(until));
      setLockedUntil(until);
    }
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(ATTEMPT_KEY);
    sessionStorage.removeItem(LOCK_KEY);
    setLockedUntil(0);
  }, []);

  const isLocked = lockedUntil > Date.now();
  const lockSeconds = isLocked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  return { honeypot, setHoneypot, check, recordFailure, reset, isLocked, lockSeconds };
}

/**
 * Renders the honeypot field — visually hidden but accessible to bots.
 */
export function HoneypotField({ value, onChange }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label htmlFor="company_website">Ne pas remplir</label>
      <input
        id="company_website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
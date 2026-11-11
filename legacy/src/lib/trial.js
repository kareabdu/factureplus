import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

// Période d'essai des utilisateurs déjà inscrits : fin 31/08/2026.
export const EXISTING_TRIAL_END = new Date("2026-08-31T23:59:59");
// À partir du 10/08/2026, tout nouvel inscrit a droit à 14 jours d'essai.
export const NEW_USER_CUTOFF = new Date("2026-08-10T00:00:00");
export const NEW_USER_TRIAL_DAYS = 14;
// À partir du 21/10/2026, les nouvelles inscriptions ont 7 jours d'essai.
export const NEW_USER_TRIAL_CUTOFF_7D = new Date("2026-10-21T00:00:00");
export const NEW_USER_TRIAL_DAYS_7D = 7;
// Afficher la barre d'avertissement 7 jours avant la fin.
export const WARNING_DAYS = 7;

export function getTrialStatus(user) {
  if (!user) return { status: "loading", trialEnd: null, daysLeft: null };
  if (user.role === "admin") return { status: "active", trialEnd: null, daysLeft: null };
  if (user.subscription_status === "active") {
    return { status: "active", trialEnd: null, daysLeft: null };
  }

  let trialEnd;
  if (user.trial_end_date) {
    trialEnd = new Date(user.trial_end_date);
  } else {
    const created = new Date(user.created_date);
    if (created >= NEW_USER_TRIAL_CUTOFF_7D) {
      trialEnd = new Date(created.getTime() + NEW_USER_TRIAL_DAYS_7D * 86400000);
    } else if (created >= NEW_USER_CUTOFF) {
      trialEnd = new Date(created.getTime() + NEW_USER_TRIAL_DAYS * 86400000);
    } else {
      trialEnd = new Date(EXISTING_TRIAL_END);
    }
  }

  const now = new Date();
  const msLeft = trialEnd.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / 86400000);
  let status;
  if (msLeft <= 0) status = "expired";
  else if (daysLeft <= WARNING_DAYS) status = "warning";
  else status = "ok";
  return { status, trialEnd, daysLeft };
}

export function useTrialStatus() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const persisted = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!active) return;
        setUser(me);
        const st = getTrialStatus(me);
        if (
          !persisted.current &&
          me.role !== "admin" &&
          me.subscription_status !== "active" &&
          !me.trial_end_date
        ) {
          persisted.current = true;
          try {
            await base44.functions.invoke("startTrial", {
              trial_end_date: st.trialEnd.toISOString(),
            });
          } catch (e) {
            /* ignore persistence failure */
          }
        }
      } catch (e) {
        /* not logged in */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const st = getTrialStatus(user);
  return { ...st, loading };
}
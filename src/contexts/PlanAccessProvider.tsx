import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { getSubscription, type SubscriptionResponse } from "@/lib/api/subscription";
import { PlanAccessContext } from "./plan-access-context";

/**
 * Loads the company's plan access (GET /api/subscription) for the signed-in app and
 * keeps it fresh: on sign-in / company change, on every page change, and when the tab
 * regains focus (e.g. after paying in Razorpay). The backend enforces the same rules;
 * this only drives the banner and friendly messages in the UI.
 */
export const PlanAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sessionReady, user, profile } = useProfile();
  const location = useLocation();
  const companyId: string | null = profile?.company_id ?? null;
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (!sessionReady || !user || !companyId) {
      setData(null);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const res = await getSubscription();
      if (seq === requestSeq.current) setData(res);
    } catch (err) {
      // Keep the last known state; the backend still enforces access
      console.warn("[PlanAccess] Could not load plan access:", err);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [sessionReady, user, companyId]);

  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const value = useMemo(
    () => ({
      data,
      loading,
      isViewOnly: !!companyId && data?.access?.mode === "view_only",
      refresh,
    }),
    [data, loading, companyId, refresh]
  );

  return <PlanAccessContext.Provider value={value}>{children}</PlanAccessContext.Provider>;
};

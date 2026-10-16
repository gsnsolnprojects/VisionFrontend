import { createContext, useContext } from "react";
import type { SubscriptionResponse } from "@/lib/api/subscription";

export type PlanAccessContextType = {
  /** GET /api/subscription result for the user's company, or null before it loads / without a company */
  data: SubscriptionResponse | null;
  loading: boolean;
  /** true when the company has no active plan: viewing only, no creating or running */
  isViewOnly: boolean;
  refresh: () => Promise<void>;
};

export const PlanAccessContext = createContext<PlanAccessContextType>({
  data: null,
  loading: false,
  isViewOnly: false,
  refresh: async () => {},
});

export const usePlanAccess = () => useContext(PlanAccessContext);

export const PLAN_REQUIRED_MESSAGE = "Your workspace needs an active plan to do this. Choose a plan in Settings → Billing.";
export const BILLING_ROUTE = "/dashboard/settings/billing";

/**
 * Why a new member can't be added right now (no plan, or the plan's user limit is
 * reached), or null when adding is fine / not known yet.
 */
export function memberLimitMessage(data: SubscriptionResponse | null): string | null {
  if (!data) return null;
  if (data.access?.mode === "view_only") return PLAN_REQUIRED_MESSAGE;
  const limit = data.access?.limits?.users;
  const used = data.usage?.users ?? 0;
  if (typeof limit === "number" && used >= limit) {
    return `Your plan includes ${limit} user${limit === 1 ? "" : "s"}. Upgrade in Settings → Billing to add more members.`;
  }
  return null;
}

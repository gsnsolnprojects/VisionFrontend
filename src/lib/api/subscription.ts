import { apiRequest } from "./config";

export type PlanId = "playground" | "pilot" | "production";

export type SubscriptionStatus = "none" | "active" | "past_due" | "cancelled" | "expired";

export interface PlanLimits {
  users: number | null; // null = unlimited
  projects: number | null;
  liveCameraStreams: number | null;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  bestFor: string;
  priceMonthlyInr: number;
  limits: PlanLimits;
  features: Record<string, boolean>;
  highlights: string[];
}

export interface CompanyAccess {
  mode: "full" | "view_only";
  reason: "unlimited" | "active" | "no_plan" | "expired" | "past_due" | "cancelled" | "none";
  plan: PlanId | null;
  limits: PlanLimits;
  features: Record<string, boolean>;
}

export interface SubscriptionResponse {
  plans: Plan[];
  subscription: {
    plan: PlanId | null;
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
    isUnlimited: boolean;
  } | null;
  access: CompanyAccess;
  usage: {
    users: number;
    projects: number;
    liveCameraStreams: number;
  } | null;
}

/**
 * The current company's plan, what it may do right now (access) and usage against limits.
 * Plan prices and limits come from the backend so they are defined in one place.
 */
export async function getSubscription(): Promise<SubscriptionResponse> {
  return apiRequest<SubscriptionResponse>("/subscription");
}

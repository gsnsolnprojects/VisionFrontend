import { apiRequest } from "./config";

export type PlanId = "playground" | "pilot" | "production";

export type SubscriptionStatus = "none" | "active" | "past_due" | "cancelled" | "expired";

export interface PlanLimits {
  users: number | null; // null = unlimited
  projects: number | null;
  liveCameraStreams: number | null;
  // Optional: older backends don't send these
  ownDatasets?: number | null; // datasets the company uploads itself (GSN sample links don't count)
  imagesPerDataset?: number | null;
  maxImageSizeMB?: number | null;
  trainingRunsPerMonth?: number | null; // resets on the 1st (India time)
  predictionsPerMonth?: number | null; // counts images, not batches
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
    cancelAtPeriodEnd: boolean;
    hasPaidSubscription: boolean;
  } | null;
  access: CompanyAccess;
  usage: {
    users: number;
    projects: number;
    liveCameraStreams: number;
  } | null;
  billing: {
    canManage: boolean; // workspace / platform admin of the company
    paymentsEnabled: boolean; // Razorpay keys configured on the backend
  };
}

export interface CheckoutSession {
  keyId: string;
  subscriptionId: string;
  plan: { id: PlanId; name: string; priceMonthlyInr: number };
  company: string | null;
}

export interface RazorpayPaymentResult {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

/**
 * The current company's plan, what it may do right now (access) and usage against limits.
 * Plan prices and limits come from the backend so they are defined in one place.
 */
export async function getSubscription(): Promise<SubscriptionResponse> {
  return apiRequest<SubscriptionResponse>("/subscription");
}

/** Start paying for a plan: returns the Razorpay subscription to open in Checkout */
export async function startCheckout(plan: PlanId): Promise<CheckoutSession> {
  return apiRequest<CheckoutSession>("/subscription/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
    maxRetries: 1, // never create two subscriptions because of a retry
  });
}

/** Confirm a completed Razorpay Checkout payment; the backend re-checks it with Razorpay */
export async function verifyCheckout(result: RazorpayPaymentResult): Promise<{ success: boolean; plan: PlanId }> {
  return apiRequest("/subscription/verify", {
    method: "POST",
    body: JSON.stringify(result),
  });
}

/** Cancel the company's plan at the end of the month already paid for */
export async function cancelSubscription(): Promise<{ success: boolean; cancelsOn: string | null }> {
  return apiRequest("/subscription/cancel", { method: "POST", maxRetries: 1 });
}

import type { PlanId } from "@/lib/api/subscription";

/**
 * The plan a visitor picked on the landing page (/auth?plan=playground). Remembered in
 * this browser through sign-up and company creation so the Billing page can highlight it.
 */
const KEY = "visionm.signupPlan";
const PLAN_IDS: PlanId[] = ["playground", "pilot", "production"];

export const rememberSignupPlan = (plan: string | null) => {
  if (!plan || !PLAN_IDS.includes(plan as PlanId)) return;
  try {
    localStorage.setItem(KEY, plan);
  } catch {
    // storage blocked: the plan just isn't highlighted later
  }
};

export const getSignupPlan = (): PlanId | null => {
  try {
    const plan = localStorage.getItem(KEY);
    return plan && PLAN_IDS.includes(plan as PlanId) ? (plan as PlanId) : null;
  } catch {
    return null;
  }
};

export const clearSignupPlan = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};

/** Where the verification email's link goes; carries the picked plan for another device */
export const verifyEmailUrl = () => {
  const plan = getSignupPlan();
  return `${window.location.origin.replace(/\/+$/, "")}/verify-email${plan ? `?plan=${plan}` : ""}`;
};

/**
 * Someone who came through the sign-up link (/start) is taken to the subscription page once
 * their organisation exists. Once per browser session, so the dashboard stays usable after that.
 */
const OPENED_KEY = "visionm.signupPlanOpened";

export const shouldOpenBillingForSignup = (): boolean => {
  try {
    return !!getSignupPlan() && !sessionStorage.getItem(OPENED_KEY);
  } catch {
    return false;
  }
};

export const markBillingOpenedForSignup = () => {
  try {
    sessionStorage.setItem(OPENED_KEY, "1");
  } catch {
    // ignore
  }
};

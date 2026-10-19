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

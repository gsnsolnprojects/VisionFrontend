import { apiRequest } from "./config";

/** A badge the student has earned, saved on the server */
export interface EarnedBadge {
  id: string;
  mission: string | null;
  /** What earned it, for example "82% match" */
  detail: string | null;
  earnedAt: string;
  /** Its award card has been shown */
  seen: boolean;
}

/** GET /api/playground/badges - the student's badges, with any newly earned saved */
export const getBadges = () => apiRequest<{ badges: EarnedBadge[] }>("/playground/badges", { maxRetries: 1 });

/** POST /api/playground/badges/seen - their award cards have been shown */
export const markBadgesSeen = (ids: string[]) =>
  apiRequest("/playground/badges/seen", { method: "POST", body: JSON.stringify({ ids }), maxRetries: 1 }).catch(() => undefined);

const PROGRESS_SAVED = "visionm:level-progress-saved";

/** Progress was saved, so a new badge may be waiting */
export const notifyProgressSaved = () => window.dispatchEvent(new Event(PROGRESS_SAVED));

export const onProgressSaved = (listener: () => void) => {
  window.addEventListener(PROGRESS_SAVED, listener);
  return () => window.removeEventListener(PROGRESS_SAVED, listener);
};

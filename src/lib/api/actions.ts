import { apiRequest, apiUrl } from "./config";

export type ActionSeverity = "low" | "medium" | "high" | "critical";
export type ActionStatus = "open" | "in_review" | "approved" | "rejected" | "completed";
/** The reviewer's maintenance decision — distinct from `status` (this action's own approval workflow state). */
export type ActionDecision = "monitor" | "inspect_further" | "repair" | "recoat" | "replace";
/** Coating-damage modes a reviewer can visually confirm on a photo, independent from the AI's rust-severity detection. */
export type DamageTag = "peeling" | "cracking" | "blistering" | "exposed_metal";

export const ACTION_DECISIONS: { value: ActionDecision; label: string }[] = [
  { value: "monitor", label: "Monitor" },
  { value: "inspect_further", label: "Inspect Further" },
  { value: "repair", label: "Repair" },
  { value: "recoat", label: "Recoat" },
  { value: "replace", label: "Replace" },
];

export const DAMAGE_TAGS: { value: DamageTag; label: string }[] = [
  { value: "peeling", label: "Peeling" },
  { value: "cracking", label: "Cracking" },
  { value: "blistering", label: "Blistering" },
  { value: "exposed_metal", label: "Exposed metal" },
];

export type ActionItem = {
  actionId: string;
  company: string;
  project: string;
  surveyName: string | null;
  regionName: string | null;
  observationId: string | null;
  componentName: string;
  inferenceId: string | null;
  filename: string | null;
  title: string;
  description: string;
  severity: ActionSeverity;
  decision: ActionDecision | null;
  damageTags: DamageTag[];
  reviewerNotes: string;
  /** The technical/engineering recommendation for addressing the finding (e.g. coating type, procedure). */
  engineeringRecommendation: string;
  /** What repair work was actually carried out — set when the action is closed (`status: 'completed'`). */
  repairActionTaken: string;
  afterPhotos: string[];
  status: ActionStatus;
  dueDate: string | null;
  createdBy: string;
  assignedTo: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  isOverdue: boolean;
  /** True when this action was closed but no survey visit for that area has happened since — i.e. the repair hasn't been confirmed with a resurvey yet. */
  needsResurvey: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListActionsParams = {
  company: string;
  project: string;
  status?: ActionStatus;
  severity?: ActionSeverity;
  overdueOnly?: boolean;
  regionName?: string;
  surveyName?: string;
  page?: number;
  limit?: number;
};

/**
 * GET /api/actions
 */
export async function listActionItems(
  params: ListActionsParams
): Promise<{ actions: ActionItem[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  }
  return apiRequest(`/actions?${qs.toString()}`);
}

/**
 * POST /api/actions
 */
export async function createActionItem(body: {
  company: string;
  project: string;
  surveyName?: string | null;
  regionName?: string | null;
  observationId?: string | null;
  componentName?: string;
  inferenceId?: string | null;
  filename?: string | null;
  title: string;
  description?: string;
  severity: ActionSeverity;
  decision?: ActionDecision | null;
  damageTags?: DamageTag[];
  engineeringRecommendation?: string;
  dueDate?: string | null;
  assignedTo?: string | null;
  findingSnapshot?: unknown;
}): Promise<{ action: ActionItem }> {
  return apiRequest(`/actions`, { method: "POST", body: JSON.stringify(body) });
}

/**
 * PATCH /api/actions/:actionId
 */
export async function updateActionItem(
  actionId: string,
  body: Partial<{
    title: string;
    description: string;
    severity: ActionSeverity;
    decision: ActionDecision | null;
    damageTags: DamageTag[];
    reviewerNotes: string;
    engineeringRecommendation: string;
    repairActionTaken: string;
    dueDate: string | null;
    assignedTo: string | null;
    status: ActionStatus;
  }>
): Promise<{ action: ActionItem }> {
  return apiRequest(`/actions/${encodeURIComponent(actionId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * DELETE /api/actions/:actionId
 */
export async function deleteActionItem(actionId: string): Promise<{ actionId: string; message: string }> {
  return apiRequest(`/actions/${encodeURIComponent(actionId)}`, { method: "DELETE" });
}

/**
 * POST /api/actions/:actionId/after-photo — attach an after-repair photo.
 */
export async function uploadAfterPhoto(actionId: string, file: File): Promise<{ action: ActionItem }> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest(`/actions/${encodeURIComponent(actionId)}/after-photo`, {
    method: "POST",
    body: form,
  });
}

/** Authenticated URL for one of an action's after-repair photos (fetch via AuthenticatedImage, not a plain <img src>). */
export function actionPhotoUrl(actionId: string, filename: string): string {
  return apiUrl(`/actions/${encodeURIComponent(actionId)}/photo/${encodeURIComponent(filename)}`);
}

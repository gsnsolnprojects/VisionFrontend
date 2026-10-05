import { apiRequest, apiUrl, getAuthHeaders } from "./config";

export type MobileInspectConfig = {
  company: string;
  project: string;
  modelId: string | null;
  mongoModelId: string | null;
  modelVersion: string | null;
  modelType: string | null;
  confidenceThreshold: number;
  updatedBy: string | null;
  updatedAt: string;
};

export type InferenceModelOption = {
  modelId: string;
  _id?: string;
  id?: string;
  modelVersion?: string;
  modelType?: string;
  name?: string;
  metrics?: {
    mAP50?: number;
    precision?: number;
    recall?: number;
  };
};

export async function getMobileInspectConfig(
  company: string,
  project: string
): Promise<{ config: MobileInspectConfig | null; message?: string }> {
  const qs = new URLSearchParams({ company, project });
  return apiRequest(`/mobile-inspect/config?${qs.toString()}`);
}

export async function putMobileInspectConfig(body: {
  company: string;
  project: string;
  modelId: string;
  confidenceThreshold?: number;
}): Promise<{ config: MobileInspectConfig; message?: string }> {
  return apiRequest(`/mobile-inspect/config`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type CorrosionByClass = {
  class: string;
  classId?: number;
  meanPercent?: number;
  percent?: number;
  count: number;
};

/** A reviewer's verdict on how a visit compares with an earlier one. */
export type VisitReview = {
  verdict: "worse" | "same" | "better";
  note: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  comparedToInferenceId: string | null;
};

/** Which visits count as a spot's reference point: its first visit, or the first visit after a closed repair. */
export type BaselineKind = "initial" | "after_repair" | null;

/** The inspector's confirmed assessment of a part (the AI's corrosion-% band is only a suggestion). */
export type PartAssessment = {
  severity: "low" | "medium" | "high" | "critical" | null;
  damageTags: Array<"peeling" | "cracking" | "blistering" | "exposed_metal">;
  assessedBy?: string | null;
  assessedAt?: string | null;
};

export type SurveyVisit = {
  inferenceId: string;
  status: string;
  regionName: string;
  surveyName: string;
  createdAt: string;
  completedAt?: string | null;
  imageCount: number;
  meanCorrosionPercent: number | null;
  byClass: CorrosionByClass[];
  /** Set when this visit is an explicit resurvey of an earlier job — lets the dashboard show a "Compare" button. */
  baselineInferenceId?: string | null;
  observationId?: string | null;
  componentName?: string;
  notes?: string;
  inspectorName?: string | null;
  assessment?: PartAssessment | null;
  /** The spot's previous completed visit, linked automatically — lets any visit be compared with the one before it. */
  previousInferenceId?: string | null;
  review?: VisitReview | null;
};

export type SurveyPart = {
  /** Unique within a survey: the observation id, or (older data) the area name. */
  partKey: string;
  regionName: string;
  /** The specific spot within the area, e.g. "Fuel pump" (empty = whole area). */
  componentName: string;
  /** Auto-assigned spot id, e.g. OBS-0004. */
  observationId: string | null;
  inspectorName: string | null;
  notes: string;
  /** Inspector-confirmed severity + damage types, once confirmed on the phone. */
  assessment: PartAssessment | null;
  visitCount: number;
  meanCorrosionPercent: number | null;
  imageCount: number;
  byClass: CorrosionByClass[];
  severityBand: "low" | "medium" | "high" | "critical" | null;
  changeFromPrevious: { delta: number; previousMeanCorrosionPercent: number } | null;
  latest: SurveyVisit;
  latestCompleted: SurveyVisit | null;
  visits: SurveyVisit[];
};

export type SurveyDetail = {
  surveyName: string;
  partCount: number;
  completedPartCount: number;
  visitCount: number;
  overallMeanCorrosionPercent: number | null;
  byClass: CorrosionByClass[];
  classNames?: string[];
  updatedAt: string | null;
  /** When the first inspection under this survey name was logged. */
  createdAt: string | null;
  parts: SurveyPart[];
};

export type SurveySummary = {
  surveyName: string;
  partCount: number;
  completedPartCount: number;
  visitCount: number;
  overallMeanCorrosionPercent: number | null;
  updatedAt: string | null;
  createdAt: string | null;
};

/**
 * GET /api/mobile-inspect/surveys
 */
export async function listMobileInspectSurveys(
  company: string,
  project: string
): Promise<{ surveys: SurveySummary[] }> {
  const qs = new URLSearchParams({ company, project });
  return apiRequest(`/mobile-inspect/surveys?${qs.toString()}`);
}

/**
 * GET /api/mobile-inspect/survey
 */
export async function getMobileInspectSurvey(
  company: string,
  project: string,
  surveyName: string
): Promise<{ survey: SurveyDetail }> {
  const qs = new URLSearchParams({ company, project, surveyName });
  return apiRequest(`/mobile-inspect/survey?${qs.toString()}`);
}

/**
 * Downloads the PDF condition report for a survey (executive summary, per-area
 * pages with change/issues/photos, issue register — GET
 * /api/mobile-inspect/survey/pdf) and triggers a browser save.
 */
export type SurveyPdfOptions = {
  /** Include photos (default true). */
  photos?: boolean;
  /** Include before/after resurvey comparisons (default true). */
  comparison?: boolean;
  /** Append the issue audit trail (default false). */
  audit?: boolean;
};

export async function downloadSurveyPdf(
  company: string,
  project: string,
  surveyName: string,
  options: SurveyPdfOptions = {}
): Promise<void> {
  const qs = new URLSearchParams({ company, project, surveyName });
  if (options.photos !== undefined) qs.set("photos", String(options.photos));
  if (options.comparison !== undefined) qs.set("comparison", String(options.comparison));
  if (options.audit !== undefined) qs.set("audit", String(options.audit));
  const headers = await getAuthHeaders();
  const res = await fetch(apiUrl(`/mobile-inspect/survey/pdf?${qs.toString()}`), { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.message || json.error || message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${surveyName.replace(/[^a-z0-9]+/gi, "_")}_report.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ComparisonPhotoPair = {
  baselineFilename: string;
  currentFilename: string;
  baselinePercent: number | null;
  currentPercent: number | null;
  delta: number | null;
};

export type ComparisonExtraPhoto = {
  filename: string;
  percent: number | null;
};

/** One visit of a spot, offered in the "compare against…" pickers. */
export type ObservationVisitOption = {
  inferenceId: string;
  surveyName: string;
  createdAt: string;
  meanCorrosionPercent: number | null;
  baselineKind: BaselineKind;
  review: VisitReview | null;
};

export type CompareResult = {
  /** 'matched' = exactly the photos the inspector re-shot in a guided resurvey; 'by_order' = paired by capture order (best effort). */
  pairing: "matched" | "by_order";
  defaultBaselineInferenceId: string | null;
  observationId: string | null;
  observationVisits: ObservationVisitOption[];
  /** The reviewer's verdict on the current visit, if any. */
  review: VisitReview | null;
  baseline: { inferenceId: string; surveyName: string; createdAt: string; meanCorrosionPercent: number | null };
  current: { inferenceId: string; surveyName: string; createdAt: string; meanCorrosionPercent: number | null };
  pairs: ComparisonPhotoPair[];
  extraCurrent: ComparisonExtraPhoto[];
  unmatchedBaseline: ComparisonExtraPhoto[];
  overallDelta: number | null;
};

/**
 * GET /api/mobile-inspect/compare — side-by-side baseline photo comparison
 * for a resurvey job (one whose SurveyVisit has `baselineInferenceId` set).
 */
export async function getInspectionComparison(
  currentInferenceId: string,
  baselineInferenceId?: string
): Promise<CompareResult> {
  const qs = new URLSearchParams({ currentInferenceId });
  if (baselineInferenceId) qs.set("baselineInferenceId", baselineInferenceId);
  return apiRequest(`/mobile-inspect/compare?${qs.toString()}`);
}

/** PUT /api/mobile-inspect/review/:inferenceId — a reviewer's verdict on a visit (verdict null clears it). */
export async function saveVisitReview(
  inferenceId: string,
  body: { verdict: "worse" | "same" | "better" | null; note?: string; comparedToInferenceId?: string | null }
): Promise<{ inferenceId: string; review: VisitReview | null }> {
  return apiRequest(`/mobile-inspect/review/${encodeURIComponent(inferenceId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function listInferenceModels(
  company: string,
  project: string
): Promise<InferenceModelOption[]> {
  const qs = new URLSearchParams({ company, project });
  const json = await apiRequest<unknown>(`/inference/models?${qs.toString()}`);
  const rawList: unknown[] = Array.isArray(json)
    ? json
    : (json as { models?: unknown[]; data?: { models?: unknown[] } }).models ||
      (json as { data?: { models?: unknown[] } }).data?.models ||
      [];
  return rawList.map((raw) => {
    const r = raw as InferenceModelOption;
    return {
      ...r,
      modelId: String(r.modelId ?? r.id ?? r._id ?? ""),
    };
  });
}

/** "Engine room › Fuel pump", or just the area when the spot has no component. */
export function partLabel(p: { regionName: string; componentName?: string | null }): string {
  return p.componentName ? `${p.regionName} › ${p.componentName}` : p.regionName;
}

export type ObservationVisit = {
  inferenceId: string;
  surveyName: string;
  createdAt: string;
  meanCorrosionPercent: number | null;
  severityBand: "low" | "medium" | "high" | "critical" | null;
  imageCount: number;
  inspectorName: string | null;
  notes: string;
  assessment: PartAssessment | null;
  baselineInferenceId: string | null;
  previousInferenceId: string | null;
  baselineKind: BaselineKind;
  review: VisitReview | null;
};

export type ObservationSummary = {
  observationId: string | null;
  regionName: string;
  componentName: string;
  visitCount: number;
  latestMeanCorrosionPercent: number | null;
  severityBand: "low" | "medium" | "high" | "critical" | null;
  /** Change between the very first and the latest inspection of this spot. */
  changeSinceFirst: number | null;
  lastInspectedAt: string;
  lastInspector: string | null;
  visits: ObservationVisit[];
};

/**
 * GET /api/mobile-inspect/observations — every spot on the vessel with its
 * inspection history across surveys.
 */
export async function listObservations(
  company: string,
  project: string
): Promise<{ observations: ObservationSummary[] }> {
  const qs = new URLSearchParams({ company, project });
  return apiRequest(`/mobile-inspect/observations?${qs.toString()}`);
}

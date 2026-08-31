import { apiRequest } from "./config";

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

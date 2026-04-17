import { apiRequest } from "@/lib/api/config";

export interface DemoExtinguisherSession {
  sessionId: string;
  cameraId: string;
  startedBy: string;
  startedAt: string;
}

export interface StartSessionResponse {
  message: string;
  session: DemoExtinguisherSession;
}

export interface ManualSubmitFramePayload {
  ocrText: string;
  confidence: number;
  confidenceThreshold?: number;
  extractFields?: ExtractFieldConfig[];
  frameId?: string;
}

export interface CameraSubmitFramePayload {
  imageBase64: string;
  confidenceThreshold?: number;
  extractFields?: ExtractFieldConfig[];
  frameId: string;
}

export interface ExtractFieldConfig {
  name: string;
  extractor: "code" | "decimal_number" | "alphanumeric" | "text";
  required: boolean;
}

export type SubmitFramePayload =
  | ManualSubmitFramePayload
  | CameraSubmitFramePayload;

export interface SubmitFrameAcceptedResponse {
  accepted: true;
  readId: string;
  code: string;
  confidence: number;
  capturedAt: string;
  minConfidenceUsed?: number;
  requestedFieldConfigs?: ExtractFieldConfig[];
  extractedFields?: Record<string, string | number | boolean | null> | string[];
  missingFields?: string[];
  optionalMissingFields?: string[];
  allRequestedFound?: boolean;
  fieldParseDebug?: unknown;
}

export interface SubmitFrameRejectedResponse {
  accepted: false;
  reason: string;
  code: string;
  confidence: number;
  duplicateSuppressed: boolean;
  minConfidenceUsed?: number;
  requestedFieldConfigs?: ExtractFieldConfig[];
  extractedFields?: Record<string, string | number | boolean | null> | string[];
  missingFields?: string[];
  optionalMissingFields?: string[];
  allRequestedFound?: boolean;
  fieldParseDebug?: unknown;
}

export type SubmitFrameResponse =
  | SubmitFrameAcceptedResponse
  | SubmitFrameRejectedResponse;

export interface DemoReadRecord {
  _id: string;
  sessionId: string;
  code: string;
  confidence: number;
  capturedAt: string;
  sourceType: "manual" | "ocr";
  duplicateSuppressed: boolean;
  extractedFields?: Record<string, string | number | boolean | null>;
  meta?: {
    frameId?: string;
    snapshotPath?: string;
    ocrRawText?: string;
    extractedFields?: Record<string, string | number | boolean | null>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GetReadsResponse {
  sessionId: string;
  count: number;
  reads: DemoReadRecord[];
}

export interface StopSessionResponse {
  message: string;
  sessionId: string;
  endedAt: string;
  stats: {
    totalAccepted: number;
    totalSuppressed: number;
  };
}

export interface ClearReadsResponse {
  message: string;
  sessionId: string;
  deletedCount: number;
}

export interface IpCameraSnapshotResponse {
  imageBase64: string;
  snapshotUrl: string;
  fetchedAt: string;
}

export const startSession = async (): Promise<StartSessionResponse> => {
  return apiRequest("/demo/extinguisher/session/start", {
    method: "POST",
    body: JSON.stringify({}),
  });
};

export const submitFrame = async (
  sessionId: string,
  payload: SubmitFramePayload
): Promise<SubmitFrameResponse> => {
  return apiRequest(
    `/demo/extinguisher/session/${encodeURIComponent(sessionId)}/frame`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
};

export const getReads = async (
  sessionId: string,
  includeSuppressed = false
): Promise<GetReadsResponse> => {
  const query = includeSuppressed ? "?includeSuppressed=true" : "";
  return apiRequest(
    `/demo/extinguisher/session/${encodeURIComponent(sessionId)}/reads${query}`
  );
};

export const stopSession = async (
  sessionId: string
): Promise<StopSessionResponse> => {
  return apiRequest(
    `/demo/extinguisher/session/${encodeURIComponent(sessionId)}/stop`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
};

export const clearReads = async (
  sessionId: string
): Promise<ClearReadsResponse> => {
  return apiRequest(
    `/demo/extinguisher/session/${encodeURIComponent(sessionId)}/reads`,
    {
      method: "DELETE",
    }
  );
};

export const getIpCameraSnapshot = async (
  baseUrl: string
): Promise<IpCameraSnapshotResponse> => {
  return apiRequest("/demo/extinguisher/ip-camera/snapshot", {
    method: "POST",
    body: JSON.stringify({ baseUrl }),
  });
};

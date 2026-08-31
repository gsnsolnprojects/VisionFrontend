import type { Image, Annotation, PolygonPoint } from "@/types/annotation";
import { apiRequest } from "./config";

/** Batch/single write: bbox and/or polygon (polygon mode may omit bbox). */
export type AnnotationWritePayload = {
  imageId: string;
  categoryId: string;
  bbox?: [number, number, number, number];
  polygon?: PolygonPoint[];
};

/**
 * Get all images for a dataset (with optional status filter)
 * GET /api/dataset/:datasetId/images
 */
export const getDatasetImages = async (
  datasetId: string,
  params?: { page?: number; limit?: number; status?: "all" | "unlabeled" | "labeled" }
): Promise<{
  images: Image[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  // Send status=all explicitly so labeled + unlabeled images are returned (edit pre-labeled datasets).
  if (params?.status != null && params.status !== "") {
    queryParams.append("status", String(params.status));
  }

  const path = `/dataset/${encodeURIComponent(datasetId)}/images${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  console.log("[getDatasetImages] Requesting:", path);

  try {
    const result = await apiRequest<{
      images: Image[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(path);
    console.log("[getDatasetImages] Response received:", result);
    return result;
  } catch (error) {
    console.error("[getDatasetImages] Error:", error);
    throw error;
  }
};

/**
 * Get annotations for a dataset (optionally filtered by imageId)
 * GET /api/dataset/:datasetId/annotations
 */
export const getAnnotations = async (
  datasetId: string,
  imageId?: string
): Promise<{
  annotations: Annotation[];
  total: number;
}> => {
  const queryParams = new URLSearchParams();
  if (imageId) queryParams.append("imageId", imageId);

  const path = `/dataset/${encodeURIComponent(datasetId)}/annotations${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  return apiRequest(path);
};

/** Per-image result from import-labels-to-annotations */
export type ImportLabelsToAnnotationsDetail = {
  imageId?: string;
  status?: string;
  annotationsCreated?: number;
  warnings?: string[];
  reason?: string;
};

/** Response from POST .../import-labels-to-annotations */
export type ImportLabelsToAnnotationsResponse = {
  imported?: number;
  skipped?: number;
  imageProcessed?: number;
  details?: ImportLabelsToAnnotationsDetail[];
  message?: string;
};

/**
 * Import existing YOLO .txt label files into Mongo annotation rows (for canvas editing).
 * POST /api/dataset/:datasetId/import-labels-to-annotations
 */
export const importLabelsToAnnotations = async (
  datasetId: string,
  body: {
    imageIds?: string[];
    replace?: boolean;
  }
): Promise<ImportLabelsToAnnotationsResponse> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/import-labels-to-annotations`;

  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
};

/**
 * Save a single annotation
 * POST /api/dataset/:datasetId/annotations
 */
export const saveAnnotation = async (
  datasetId: string,
  annotation: AnnotationWritePayload
): Promise<{
  annotation: Annotation;
  message: string;
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/annotations`;

  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(annotation),
  });
};

/**
 * Update an existing annotation
 * PUT /api/dataset/:datasetId/annotations/:annotationId
 */
export const updateAnnotation = async (
  datasetId: string,
  annotationId: string,
  data: {
    bbox?: [number, number, number, number];
    polygon?: PolygonPoint[];
    categoryId?: string;
  }
): Promise<{
  annotation: Annotation;
  message: string;
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/annotations/${encodeURIComponent(annotationId)}`;

  return apiRequest(path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * Delete an annotation
 * DELETE /api/dataset/:datasetId/annotations/:annotationId
 */
export const deleteAnnotation = async (
  datasetId: string,
  annotationId: string
): Promise<{
  message: string;
  annotationId: string;
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/annotations/${encodeURIComponent(annotationId)}`;

  return apiRequest(path, {
    method: "DELETE",
  });
};

/**
 * Batch save annotations
 * POST /api/dataset/:datasetId/annotations/batch
 */
export type BatchSaveAnnotationsResponse = {
  saved: number;
  failed: number;
  skippedDuplicates?: number;
  errors?: Array<{ imageId: string; error: string }>;
  annotations?: Annotation[];
};

export const batchSaveAnnotations = async (
  datasetId: string,
  annotations: AnnotationWritePayload[]
): Promise<BatchSaveAnnotationsResponse> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/annotations/batch`;

  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify({ annotations }),
  });
};

/**
 * Update annotation state (Phase 6)
 * PUT /api/dataset/:datasetId/annotations/:annotationId/state
 */
export const updateAnnotationState = async (
  datasetId: string,
  annotationId: string,
  state: "draft" | "reviewed" | "approved" | "rejected",
  userId: string
): Promise<{
  annotation: Annotation;
  message: string;
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/annotations/${encodeURIComponent(annotationId)}/state`;

  return apiRequest(path, {
    method: "PUT",
    body: JSON.stringify({ state, userId }),
  });
};

/**
 * Bulk update annotation states (Phase 6)
 * PUT /api/dataset/:datasetId/annotations/bulk-state
 */
export const bulkUpdateAnnotationState = async (
  datasetId: string,
  annotationIds: string[],
  state: "draft" | "reviewed" | "approved" | "rejected",
  userId: string
): Promise<{
  updated: number;
  failed: number;
  message: string;
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/annotations/bulk-state`;

  return apiRequest(path, {
    method: "PUT",
    body: JSON.stringify({ annotationIds, state, userId }),
  });
};

/**
 * Click-to-mask (SAM): one image click → simplified polygon.
 * POST /api/dataset/:datasetId/click-to-mask
 * First call can take ~1–2 min while SAM weights download.
 */
export const clickToMask = async (
  datasetId: string,
  body: { imageId: string; x: number; y: number }
): Promise<{ polygon: PolygonPoint[]; pointCount: number }> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/click-to-mask`;
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body),
    maxRetries: 1,
  });
};


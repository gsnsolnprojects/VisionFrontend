import type { Image, Annotation } from "@/types/annotation";
import { apiRequest } from "./config";

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
  if (params?.status && params.status !== "all") {
    queryParams.append("status", params.status);
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

/**
 * Save a single annotation
 * POST /api/dataset/:datasetId/annotations
 */
export const saveAnnotation = async (
  datasetId: string,
  annotation: {
    imageId: string;
    bbox: [number, number, number, number];
    categoryId: string;
  }
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
export const batchSaveAnnotations = async (
  datasetId: string,
  annotations: Array<{
    imageId: string;
    bbox: [number, number, number, number];
    categoryId: string;
  }>
): Promise<{
  saved: number;
  failed: number;
  errors?: Array<{ imageId: string; error: string }>;
}> => {
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


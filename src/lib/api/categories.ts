import type { Category } from "@/types/annotation";
import { apiRequest } from "./config";

/**
 * Get categories for a dataset
 * GET /api/dataset/:datasetId/categories
 */
export const getCategories = async (
  datasetId: string
): Promise<{
  categories: Category[];
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/categories`;

  return apiRequest(path);
};

/**
 * Create a new category
 * POST /api/dataset/:datasetId/categories
 */
export const createCategory = async (
  datasetId: string,
  data: {
    name: string;
    color: string;
    description?: string;
  }
): Promise<{
  category: Category;
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/categories`;

  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * Update a category
 * PUT /api/dataset/:datasetId/categories/:categoryId
 */
export const updateCategory = async (
  datasetId: string,
  categoryId: string,
  data: {
    name?: string;
    color?: string;
    description?: string;
  }
): Promise<{
  category: Category;
  message: string;
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/categories/${encodeURIComponent(categoryId)}`;

  return apiRequest(path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * Delete a category
 * DELETE /api/dataset/:datasetId/categories/:categoryId
 */
export const deleteCategory = async (
  datasetId: string,
  categoryId: string,
  reassignTo?: string
): Promise<{
  message: string;
  reassignedCount?: number;
}> => {
  const queryParams = new URLSearchParams();
  if (reassignTo) queryParams.append("reassignTo", reassignTo);

  const path = `/dataset/${encodeURIComponent(datasetId)}/categories/${encodeURIComponent(categoryId)}${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  return apiRequest(path, {
    method: "DELETE",
  });
};

/**
 * Reorder categories
 * PUT /api/dataset/:datasetId/categories/reorder
 */
export const reorderCategories = async (
  datasetId: string,
  categoryIds: string[]
): Promise<{
  message: string;
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/categories/reorder`;

  return apiRequest(path, {
    method: "PUT",
    body: JSON.stringify({ categoryIds }),
  });
};

/**
 * Get detected class IDs from labeled dataset
 * GET /api/dataset/:datasetId/detected-classes
 */
export interface DetectedClassesResponse {
  datasetId: string;
  classIds: number[];
  classNames: string[];
  totalClasses: number;
  hasCategories: boolean;
  // Optional sample thumbnails for each class ID (may be missing on older backends)
  samples?: {
    classId: number;
    imageId: string;
    filename: string;
    thumbnailUrl: string | null;
  }[];
}

export const getDetectedClasses = async (
  datasetId: string
): Promise<DetectedClassesResponse> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/detected-classes`;

  return apiRequest(path);
};

/**
 * Create categories from detected class IDs with user-provided names
 * POST /api/dataset/:datasetId/create-categories-from-classes
 */
export interface CreateCategoriesFromClassesResponse {
  message: string;
  createdCount: number;
  updatedCount?: number;
  classes: number[];
  categories: Category[];
}

export const createCategoriesFromClasses = async (
  datasetId: string,
  classMappings: Record<string, string>
): Promise<CreateCategoriesFromClassesResponse> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/create-categories-from-classes`;

  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify({ classMappings }),
  });
};
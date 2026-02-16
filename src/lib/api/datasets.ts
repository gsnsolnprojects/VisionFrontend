import { apiRequest } from "./config";

export type ThumbnailItem = {
  imageId: string;
  datasetId: string;
  folder: string | null;
  width: number;
  height: number;
  hasLabels: boolean;
  classes?: number[];
  thumbnailUrl: string;
  fullImageUrl: string;
};

export type ThumbnailsResponse = {
  datasetId: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  filters: {
    folder: string | null;
    hasLabels: string | null;
  };
  items: ThumbnailItem[];
};

/**
 * Fetch paginated thumbnails for a dataset.
 */
export const fetchDatasetThumbnails = async (params: {
  datasetId: string;
  page?: number;
  pageSize?: number;
  folder?: string;
  hasLabels?: boolean;
}): Promise<ThumbnailsResponse> => {
  const { datasetId, page, pageSize, folder, hasLabels } = params;

  const search = new URLSearchParams();
  if (page !== undefined) search.append("page", String(page));
  if (pageSize !== undefined) search.append("pageSize", String(pageSize));
  if (folder) search.append("folder", folder);
  if (hasLabels !== undefined) {
    search.append("hasLabels", hasLabels ? "true" : "false");
  }

  const path = `/dataset/${encodeURIComponent(datasetId)}/thumbnails${
    search.toString() ? `?${search.toString()}` : ""
  }`;

  return apiRequest<ThumbnailsResponse>(path);
};

/**
 * Augmentation-related types and helpers
 */
export type AugmentationStatus = "not_started" | "running" | "succeeded" | "failed";

export interface DatasetStatusResponse {
  id: string;
  status?: string;
  version?: number;
  totalImages?: number;
  sizeBytes?: number;
  createdAt?: string;
  augmentation_status?: AugmentationStatus;
  augmentation_error?: string;
  is_augmented?: boolean;
  backup_dataset_id?: string | null;
  datasetType?: "labeled" | "unlabeled";
  annotationStatus?: "pending" | "completed";
  unlabeledImagesCount?: number;
  augmentationMultiplier?: number;
  augmentedFromVersion?: string | number | null;
  currentDatasetId?: string | null;
  isActive?: boolean;
}

/**
 * Start dataset augmentation for a given dataset.
 * Backend is expected to perform the heavy lifting asynchronously.
 * versionName is required; options are optional augmentation parameters.
 */
export const augmentDataset = async (
  datasetId: string,
  versionName: string,
  options?: {
    augmentationMultiplier?: number;
    targetTrainTotal?: number;
    valTestMultiplier?: number;
  }
): Promise<{ datasetId: string; augmentedDatasetId?: string; message?: string }> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/augment`;
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify({
      versionName: versionName.trim(),
      options,
    }),
  });
};

/**
 * Fetch high-level dataset status, including augmentation flags when available.
 * This mirrors the backend dataset status shape but keeps fields optional
 * so it won't break if the backend hasn't been updated yet.
 */
export const fetchDatasetStatus = async (
  datasetId: string
): Promise<DatasetStatusResponse> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/status`;
  return apiRequest<DatasetStatusResponse>(path);
};

/**
 * Fetch the active dataset for a project.
 * Returns the single dataset with isActive: true for that project (e.g. the augmented dataset after augmentation completes).
 * Use this when you need "the one to show now" for the file browser.
 */
export interface ActiveDatasetResponse {
  id?: string;
  _id?: string;
  datasetId?: string;
  version?: string;
  isActive?: boolean;
  files?: Array<{
    storedName?: string;
    originalName?: string;
    type?: string;
    size?: number;
    folder?: string;
    storedPath?: string;
  }>;
  [k: string]: unknown;
}

export const fetchActiveDataset = async (
  company: string,
  project: string
): Promise<ActiveDatasetResponse | null> => {
  const path = `/dataset/active/${encodeURIComponent(company)}/${encodeURIComponent(project)}`;
  try {
    const res = await apiRequest<ActiveDatasetResponse>(path);
    const id = res?.id ?? res?._id ?? res?.datasetId;
    return id ? res : null;
  } catch {
    return null;
  }
};

/**
 * Cancel an in-progress dataset augmentation.
 * Backend will remove job from queue, mark datasets appropriately, and clean up.
 */
export const cancelAugmentation = async (
  datasetId: string
): Promise<{ message?: string }> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/augment/cancel`;
  return apiRequest(path, {
    method: "POST",
  });
};

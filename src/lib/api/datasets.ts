import { apiRequest, apiUrl, getAuthHeaders } from "./config";

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
  trainCount?: number;
  valCount?: number;
  testCount?: number;
  otherCount?: number;
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
  /** Source of labels: 'unlabeled' | 'pre_labelled' | 'manually_labeled'. For augmented datasets, reflects the source. */
  labelSource?: "unlabeled" | "pre_labelled" | "manually_labeled" | null;
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

/**
 * Scan YOLO .txt labels and report detection vs segmentation vs unlabeled/mixed.
 */
export type DatasetTypeCheck = {
  datasetId: string;
  version?: string;
  type: "unlabeled" | "detection" | "segmentation" | "mixed";
  summary: string;
  recommendation: string;
  counts: {
    imageFiles: number;
    labelFiles: number;
    labeledFiles: number;
    emptyLabelFiles: number;
    unreadableFiles: number;
    detectionLines: number;
    segmentationLines: number;
    invalidLines: number;
    uniqueClasses: number;
  };
  classIds: number[];
  recordedDatasetType?: string | null;
  recordedLabelSource?: string | null;
};

/**
 * Scan YOLO .txt labels and report detection vs segmentation vs unlabeled/mixed.
 */
export const checkDatasetType = async (
  datasetId: string
): Promise<DatasetTypeCheck> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/type-check`;
  return apiRequest<DatasetTypeCheck>(path);
};

/**
 * Download dataset as a ZIP file.
 * Files use original names for user-friendly export (e.g. after labeling/augmentation).
 * Triggers browser download; returns when download starts.
 * @param flat - If true, request flat structure (images/, labels/). If false/omitted, full structure (images/train|val|test, etc.).
 */
export const downloadDataset = async (
  datasetId: string,
  options?: { flat?: boolean }
): Promise<void> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/download`;
  const query = options?.flat ? "?flat=true" : "";
  const url = apiUrl(path + query);
  const headers = await getAuthHeaders();
  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...headers,
      "Content-Type": "application/zip",
    },
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    let msg = `Download failed: ${response.status}`;
    try {
      const j = JSON.parse(errText);
      msg = j.message || j.error || msg;
    } catch {
      if (errText) msg = errText;
    }
    throw new Error(msg);
  }
  const blob = await response.blob();
  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = "dataset.zip";
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1].trim();
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

/**
 * Add images / optional .txt labels to an existing dataset version.
 * POST /api/dataset/:datasetId/files  (multipart: files[], folder)
 */
export const addDatasetFiles = async (
  datasetId: string,
  files: File[],
  folder: string
): Promise<{
  added: number;
  addedImages?: number;
  skipped: number;
  folder: string;
  totalImages?: number;
  trainCount?: number;
  valCount?: number;
  testCount?: number;
  message?: string;
}> => {
  const formData = new FormData();
  formData.append("folder", folder);
  for (const file of files) {
    formData.append("files", file, file.name);
  }
  return apiRequest(`/dataset/${encodeURIComponent(datasetId)}/files`, {
    method: "POST",
    body: formData,
    maxRetries: 1,
  });
};

/**
 * Delete one photo (and its matching label) from a dataset version.
 * DELETE /api/dataset/:datasetId/files/:fileId
 */
export const deleteDatasetFile = async (
  datasetId: string,
  fileId: string
): Promise<{
  deleted: number;
  names?: string[];
  totalImages?: number;
  trainCount?: number;
  valCount?: number;
  testCount?: number;
  message?: string;
}> => {
  return apiRequest(
    `/dataset/${encodeURIComponent(datasetId)}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE" }
  );
};

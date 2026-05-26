import { apiRequest } from "./config";

/**
 * Convert annotations to YOLO label format (bbox or seg lines).
 * RF-DETR training uses modelType "YOLO" here (5-value bbox lines), not "RF_DETR".
 * POST /api/dataset/:datasetId/convert-annotations-to-labels
 */
export const convertAnnotationsToLabels = async (
  datasetId: string,
  options: {
    /** Explicit YOLO detect vs YOLO segmentation export. */
    modelType: "YOLO" | "YOLO_SEG";
    imageIds?: string[];
    folder?: string;
    categories?: Array<{ id: string; name: string }>; // Phase 6: Category names for YOLO data.yaml
    unannotatedImageIds?: string[]; // Phase 5: For creating empty label files for good images
  }
): Promise<{
  converted: number;
  labelFilesCreated: number;
  message: string;
}> => {
  const path = `/dataset/${encodeURIComponent(datasetId)}/convert-annotations-to-labels`;

  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(options),
  });
};

/**
 * Get model download URL
 * GET /api/models/:modelId/download-url
 */
export const getModelDownloadUrl = async (
  modelId: string,
  format: "pt" | "onnx" | "zip"
): Promise<{
  downloadUrl: string;
  expiresAt: string;
  fileSize: number;
}> => {
  const path = `/models/${encodeURIComponent(modelId)}/download-url?format=${format}`;

  return apiRequest(path);
};

/**
 * Get model info
 * GET /api/models/:modelId
 */
export const getModelInfo = async (
  modelId: string
): Promise<{
  id: string;
  name: string;
  format: string;
  size: number;
  createdAt: string;
  availableFormats: string[];
  /** Ordered YOLO class names (same strings as inference `class`); may be [] */
  classNames?: string[];
}> => {
  const path = `/models/${encodeURIComponent(modelId)}`;

  return apiRequest(path);
};

/**
 * Scan network for devices with folder access
 * GET /api/models/:modelId/deploy/scan-devices
 */
export const scanNetworkDevices = async (
  modelId: string,
  options?: {
    networkRange?: string;
    timeout?: number;
    folderName?: string;
  }
): Promise<{
  devices: Array<{
    ipAddress: string;
    deviceName?: string;
    hasFolderAccess: boolean;
    folderPath?: string;
    status: "available" | "unavailable" | "checking";
    lastChecked?: string;
  }>;
  total: number;
  available: number;
}> => {
  const params = new URLSearchParams();
  if (options?.networkRange) {
    params.append("networkRange", options.networkRange);
  }
  if (options?.timeout) {
    params.append("timeout", options.timeout.toString());
  }
  if (options?.folderName) {
    params.append("folderName", options.folderName);
  }
  const queryString = params.toString();
  const path = `/models/${encodeURIComponent(modelId)}/deploy/scan-devices${queryString ? `?${queryString}` : ""}`;

  return apiRequest(path);
};

/**
 * Check device by IP address
 * GET /api/models/:modelId/deploy/check-device
 */
export const checkDeviceByIp = async (
  modelId: string,
  ipAddress: string
): Promise<{
  ipAddress: string;
  deviceName?: string;
  hasFolderAccess: boolean;
  folderPath?: string;
  status: "available" | "unavailable" | "checking";
  lastChecked?: string;
}> => {
  const path = `/models/${encodeURIComponent(modelId)}/deploy/check-device?ipAddress=${encodeURIComponent(ipAddress)}`;

  return apiRequest(path);
};

/**
 * Deploy model to device
 * POST /api/models/:modelId/deploy
 */
export const deployModelToDevice = async (
  modelId: string,
  config: {
    ipAddress: string;
    folderPath: string;
    deviceName?: string;
    format?: 'pt' | 'onnx';
    targetFileName?: string;
  }
): Promise<{
  deploymentId: string;
  modelId: string;
  ipAddress: string;
  folderPath: string;
  status: string;
  message: string;
  startedAt: string;
}> => {
  const path = `/models/${encodeURIComponent(modelId)}/deploy`;

  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify({
      ipAddress: config.ipAddress,
      folderPath: config.folderPath,
      deviceName: config.deviceName,
      format: config.format || 'pt',
      targetFileName: config.targetFileName,
    }),
  });
};
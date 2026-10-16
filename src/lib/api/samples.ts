import { apiRequest, apiUrl } from "./config";

/** Preview picture of a sample dataset (load it with AuthenticatedImage: it needs the login token) */
export const sampleDatasetThumbnailUrl = (datasetId: string) =>
  apiUrl(`/samples/datasets/${encodeURIComponent(datasetId)}/thumbnail`);

/** Cover pictures for the industry folders (the landing page's industry images) */
export const INDUSTRY_COVERS: Record<string, string> = {
  Pharma: "/industry/pharma.png",
  Automotive: "/industry/automobile.png",
  Electronics: "/industry/pcb.png",
  "Marine & Corrosion": "/industry/port.png",
  General: "/industry/consumer.png",
};

/**
 * Sample library: GSN's ready datasets and trained models, which any company can
 * copy into one of its projects (Playground).
 */

export interface SampleDataset {
  id: string;
  /** Display name, industry and description set by the superadmin in the sample library */
  name: string;
  industry: string;
  description: string;
  project: string;
  version: string;
  totalImages: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  labels: string[];
  datasetType: string | null;
  createdAt: string;
}

export interface SampleModel {
  id: string;
  project: string;
  modelVersion: string;
  modelType: string;
  mAP50: number | null;
  precision: number | null;
  recall: number | null;
  datasetVersion: string;
  createdAt: string;
}

export const getSamples = () => apiRequest<{ datasets: SampleDataset[]; models: SampleModel[] }>("/samples");

export const importSampleDataset = (datasetId: string, project: string) =>
  apiRequest<{ success: boolean; datasetId: string; version: string; images: number }>(
    `/samples/datasets/${encodeURIComponent(datasetId)}/import`,
    { method: "POST", body: JSON.stringify({ project }), maxRetries: 1 }
  );

export const importSampleModel = (modelId: string, project: string) =>
  apiRequest<{ success: boolean; modelId: string; modelVersion: string }>(
    `/samples/models/${encodeURIComponent(modelId)}/import`,
    { method: "POST", body: JSON.stringify({ project }), maxRetries: 1 }
  );

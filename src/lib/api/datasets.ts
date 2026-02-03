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


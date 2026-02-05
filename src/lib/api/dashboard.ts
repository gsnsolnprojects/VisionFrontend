import { getAuthHeaders, apiUrl } from "@/lib/api/config";

export interface ProjectSummaryResponse {
  company: string;
  project: string;
  datasetsCount: number;
  modelsCount: number;
  trainingJobsCount: number;
  inferenceJobsCount: number;
}

export interface DeleteProjectResponse {
  message: string;
  company: string;
  project: string;
  deleted: {
    datasets: number;
    models: number;
    trainingJobs: number;
    inferenceJobs: number;
  };
}

/**
 * GET /api/dashboard/project - Load project summary (counts) for delete confirmation.
 * Query: company (required), project (required).
 */
export async function getProjectSummary(
  company: string,
  project: string
): Promise<ProjectSummaryResponse> {
  const params = new URLSearchParams({ company, project });
  const url = apiUrl(`/dashboard/project?${params.toString()}`);
  const headers = await getAuthHeaders();
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error ?? errBody?.message ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

/**
 * DELETE /api/dashboard/project - Delete project and all its data.
 * Query or body: company (required), project (required).
 * 200: success; 400: e.g. datasets still processing; 403: permission denied.
 */
export async function deleteProject(
  company: string,
  project: string
): Promise<DeleteProjectResponse> {
  const params = new URLSearchParams({ company, project });
  const url = apiUrl(`/dashboard/project?${params.toString()}`);
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.error ?? data?.message ?? (res.status === 403 ? "You don't have permission to delete this project." : `Request failed: ${res.status}`);
    throw new Error(msg);
  }
  return data as DeleteProjectResponse;
}

import { apiRequest } from "./config";

/**
 * Superadmin panel API (GSN platform admin only) — /api/admin/*
 */

export interface AdminOverview {
  companies: number;
  users: { total: number; active: number; disabled: number; newLast7Days: number; newLast30Days: number };
  projects: number;
  datasets: number;
  models: number;
  trainingJobs: { total: number; active: number };
  inferenceJobs: { total: number; active: number };
  revenue: { mrrInr: number; paidCompanies: number; thisMonthInr: number; totalInr: number };
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  companyId: string | null;
  companyName: string | null;
  isActive: boolean;
  isSuperadmin: boolean;
  emailVerified: boolean;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  createdAt: string | null;
  noProfile?: boolean;
}

export interface AdminCompany {
  id: string;
  name: string;
  description: string | null;
  adminEmail: string | null;
  createdByEmail: string | null;
  createdAt: string;
  isGsn: boolean;
  members: number;
  admins: string[];
  projects: number;
  datasets: number;
  models: number;
  trainingJobs: number;
  inferenceJobs: number;
  subscription: {
    plan: string | null;
    planName: string | null;
    status: string;
    currentPeriodEnd: string | null;
    isUnlimited: boolean;
    cancelAtPeriodEnd: boolean;
    hasPaidSubscription: boolean;
  } | null;
}

export interface AdminPayment {
  paymentId: string;
  companyId: string | null;
  companyName: string;
  plan: string | null;
  amountInr: number;
  currency: string;
  paidAt: string;
}

export interface AdminRevenue {
  mrrInr: number;
  paidCompanies: number;
  totalInr: number;
  thisMonthInr: number;
  planBreakdown: { plan: string; name: string; priceMonthlyInr: number; activeCompanies: number }[];
  byMonth: { month: string; amountInr: number; payments: number }[];
  byCompany: { companyId: string | null; companyName: string; amountInr: number; payments: number }[];
  payments: AdminPayment[];
  paymentsAvailable: boolean;
}

export interface AdminJob {
  id: string;
  company: string;
  project: string;
  detail: string | null;
  status: string;
  error: string | null;
  createdBy?: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  userEmail: string | null;
  company: string | null;
  project: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
}

export const getAdminOverview = () => apiRequest<AdminOverview>("/admin/overview");

export const getAdminUsers = () => apiRequest<{ users: AdminUser[] }>("/admin/users");

export const setAdminUserStatus = (userId: string, active: boolean) =>
  apiRequest<{ success: boolean }>(`/admin/users/${userId}/status`, {
    method: "POST",
    body: JSON.stringify({ active }),
    maxRetries: 1,
  });

export const deleteAdminUser = (userId: string, confirmEmail: string) =>
  apiRequest<{ success: boolean }>(`/admin/users/${userId}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmEmail }),
    maxRetries: 1,
  });

export const getAdminCompanies = () => apiRequest<{ companies: AdminCompany[] }>("/admin/companies");

export const setAdminCompanyUnlimited = (companyId: string, isUnlimited: boolean) =>
  apiRequest<{ success: boolean }>(`/admin/companies/${companyId}/unlimited`, {
    method: "PATCH",
    body: JSON.stringify({ isUnlimited }),
    maxRetries: 1,
  });

export const deleteAdminCompany = (companyId: string, confirmName: string) =>
  apiRequest<{ success: boolean; steps: string[] }>(`/admin/companies/${companyId}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmName }),
    maxRetries: 1,
  });

export const getAdminRevenue = () => apiRequest<AdminRevenue>("/admin/revenue");

export const getAdminJobs = (type: "training" | "inference") =>
  apiRequest<{ type: string; jobs: AdminJob[] }>(`/admin/jobs?type=${type}`);

export const getAdminAudit = () => apiRequest<{ entries: AdminAuditEntry[] }>("/admin/audit");

// ---- Playground sample dataset library ----

export interface SampleLibraryDatasetInfo {
  project: string;
  version: string;
  totalImages: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  labels: string[];
  onThisServer: boolean;
  usable: boolean;
}

export interface SampleLibraryItem {
  id: string;
  datasetId: string;
  name: string;
  industry: string;
  description: string;
  isVisible: boolean;
  createdAt: string;
  dataset: SampleLibraryDatasetInfo | null;
}

export interface SampleLibraryCandidate extends SampleLibraryDatasetInfo {
  datasetId: string;
  suggestedName: string;
  suggestedIndustry: string;
}

export interface SampleLibraryResponse {
  industries: string[];
  items: SampleLibraryItem[];
  available: SampleLibraryCandidate[];
}

export const getSampleLibrary = () => apiRequest<SampleLibraryResponse>("/admin/sample-library");

export const addToSampleLibrary = (body: { datasetId: string; name?: string; industry?: string; description?: string }) =>
  apiRequest<{ success: boolean; id: string }>("/admin/sample-library", {
    method: "POST",
    body: JSON.stringify(body),
    maxRetries: 1,
  });

export const addAllToSampleLibrary = () =>
  apiRequest<{ success: boolean; added: number }>("/admin/sample-library/add-all", { method: "POST", maxRetries: 1 });

export const updateSampleLibraryItem = (
  itemId: string,
  body: Partial<Pick<SampleLibraryItem, "name" | "industry" | "description" | "isVisible">>
) =>
  apiRequest<{ success: boolean }>(`/admin/sample-library/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    maxRetries: 1,
  });

/** Per GSN project (name trimmed): how many of its ready datasets are shown in Playground */
export const getProjectPlaygroundStatus = () =>
  apiRequest<{ projects: Record<string, { shown: number; total: number }> }>("/admin/sample-library/projects");

export const setProjectPlayground = (project: string, enabled: boolean) =>
  apiRequest<{ success: boolean; project: string; enabled: boolean; shown: number; total: number }>(
    "/admin/sample-library/projects/playground",
    { method: "POST", body: JSON.stringify({ project, enabled }), maxRetries: 1 }
  );

/** Playground state of every version in a GSN project (keyed by datasetId) */
export const getDatasetPlaygroundStatus = (project: string) =>
  apiRequest<{
    datasets: Record<string, { shown: boolean; inLibrary: boolean; eligible: boolean; reason: string | null }>;
  }>(`/admin/sample-library/datasets?project=${encodeURIComponent(project)}`);

export const setDatasetPlayground = (datasetId: string, enabled: boolean) =>
  apiRequest<{ success: boolean; datasetId: string; enabled: boolean }>(
    `/admin/sample-library/datasets/${encodeURIComponent(datasetId)}/playground`,
    { method: "POST", body: JSON.stringify({ enabled }), maxRetries: 1 }
  );

export const deleteSampleLibraryItem = (itemId: string, confirmName: string) =>
  apiRequest<{ success: boolean }>(`/admin/sample-library/${itemId}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmName }),
    maxRetries: 1,
  });

// ---------- Publish to live (local setup only) ----------

export interface PublishModel {
  id: string;
  modelId: string;
  modelType: string;
  modelVersion: string;
  createdAt: string | null;
  folder: string;
  onThisServer: boolean;
  sizeBytes: number;
}

export interface PublishVersion {
  id: string;
  company: string;
  project: string;
  version: string;
  status: string;
  totalImages: number;
  createdAt: string | null;
  selected: boolean;
  onThisServer: boolean;
  sizeBytes: number;
  models: PublishModel[];
}

export interface PublishProject {
  /** Supabase project id; null when datasets exist without a project row */
  projectId: string | null;
  company: string | null;
  project: string;
  /** shown on the live site */
  publish: boolean;
  versions: PublishVersion[];
}

export const getPublishDatasets = () => apiRequest<{ projects: PublishProject[] }>("/admin/publish/datasets", { maxRetries: 1 });

export const savePublishSelection = (datasetIds: string[]) =>
  apiRequest<{ success: boolean; selected: number; added: number; removed: number }>("/admin/publish/selection", {
    method: "PUT",
    body: JSON.stringify({ datasetIds }),
    maxRetries: 1,
  });

export const setPublishProject = (projectId: string, publish: boolean) =>
  apiRequest<{ success: boolean; projectId: string; publish: boolean; unticked: number }>("/admin/publish/project", {
    method: "PUT",
    body: JSON.stringify({ projectId, publish }),
    maxRetries: 1,
  });

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

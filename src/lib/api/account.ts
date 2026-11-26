/**
 * The signed-in person's own data through our backend (/api/account and /api/invites).
 * Replaces the direct Supabase table calls, the rpc() calls and the edge functions.
 *
 * Every function throws an Error with a readable message when the request fails, except
 * accountCall(), which returns { ok, status, body } for screens that need the details.
 */
import { apiRequest, apiUrl, getAuthHeaders } from "@/lib/api/config";

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: string | null;
  company_id: string | null;
  is_active: boolean;
  is_verified: boolean;
  color_theme: string;
  created_at: string | null;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  admin_email: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  project_type: string;
  publish_to_live: boolean;
}

export interface JoinRequest {
  id: string;
  user_id: string;
  company_name: string;
  admin_email: string;
  token: string;
  status: string;
  created_at: string;
  requester_email: string | null;
}

/** The live site shows only projects the superadmin published (projects.publish_to_live); local dev shows all */
const LIVE_ONLY = import.meta.env.PROD;

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

/** Low-level call that never throws for HTTP errors: { ok, status, body } */
export async function accountCall<T = any>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: T }> {
  const headers = await getAuthHeaders();
  try {
    const res = await fetch(apiUrl(path), { ...init, headers: { ...headers, ...(init.headers || {}) }, credentials: "include" });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: "Can't reach the server. Check your connection and try again." } as any };
  }
}

/** Message from a { ok:false } style body */
export const errorMessage = (body: any, fallback = "Something went wrong") =>
  (body && (body.message || body.error)) || fallback;

// ---- profile ---------------------------------------------------------------------------------

export async function getMyProfile(): Promise<Profile | null> {
  return (await apiRequest<{ profile: Profile | null }>("account/profile", { maxRetries: 1 })).profile;
}

export async function updateMyProfile(fields: Partial<Pick<Profile, "name" | "phone" | "color_theme">>): Promise<Profile> {
  return (await apiRequest<{ profile: Profile }>("account/profile", { method: "PATCH", ...json(fields), maxRetries: 1 })).profile;
}

// ---- organisation ----------------------------------------------------------------------------

export async function getMyCompany(): Promise<Company | null> {
  return (await apiRequest<{ company: Company | null }>("account/company", { maxRetries: 1 })).company;
}

export async function updateMyCompany(fields: { description: string | null }): Promise<Company> {
  return (await apiRequest<{ company: Company }>("account/company", { method: "PATCH", ...json(fields), maxRetries: 1 })).company;
}

/** Same result as the old rpc("check_company_exists"): [] or [{ id, name, admin_email }] */
export async function findCompanyByName(name: string): Promise<{ id: string; name: string; admin_email: string } | null> {
  const r = await apiRequest<{ exists: boolean; company: { id: string; name: string; admin_email: string } | null }>(
    `account/company-exists?name=${encodeURIComponent(name)}`,
    { maxRetries: 1 }
  );
  return r.company;
}

/** Create an organisation (you become its admin). Returns { ok, company?, error? } like the old edge function */
export async function createCompany(input: { companyName: string; adminEmail: string; description?: string }) {
  const r = await accountCall<{ ok?: boolean; company?: Company; error?: string; message?: string }>("account/company", {
    method: "POST",
    ...json(input),
  });
  return { ok: r.ok && r.body?.ok !== false, status: r.status, company: r.body?.company, error: r.ok ? null : errorMessage(r.body) };
}

// ---- members & invites -----------------------------------------------------------------------

export async function listMembers(): Promise<Profile[]> {
  return (await apiRequest<{ members: Profile[] }>("account/members", { maxRetries: 1 })).members;
}

export async function updateMember(id: string, fields: { is_active?: boolean; role?: string }) {
  return (await apiRequest<{ member: Profile }>(`account/members/${encodeURIComponent(id)}`, { method: "PATCH", ...json(fields), maxRetries: 1 })).member;
}

export async function getLatestInvite(): Promise<{ email: string; status: string; created_at: string; updated_at: string | null } | null> {
  return (await apiRequest<{ invite: any }>("account/invites/latest", { maxRetries: 1 })).invite;
}

/** Invite by email; returns the raw body so the dialog can show errorCode / waitTimeSeconds */
export function createInvite(companyId: string, inviteEmail: string) {
  return accountCall<{ success: boolean; inviteId?: string; inviteLink?: string; error?: string; errorCode?: string; waitTimeSeconds?: number; details?: string }>(
    "account/invites",
    { method: "POST", ...json({ companyId, inviteEmail }) }
  );
}

/** Is an invite link still valid? (works signed out) Same body as the old validate-invite */
export async function validateInvite(token: string): Promise<{ ok: boolean; error?: string; invite?: { id: string; company_id: string; company_name: string | null; invite_email: string } }> {
  try {
    const res = await fetch(apiUrl(`invites/${encodeURIComponent(token)}`), { credentials: "include" });
    return await res.json().catch(() => ({ ok: false, error: "Could not check the invite" }));
  } catch {
    return { ok: false, error: "Can't reach the server. Check your connection and try again." };
  }
}

/** Join the organisation from an invite link (signed in). Same body as the old accept-invite */
export async function acceptInvite(token: string): Promise<{ ok: boolean; error?: string }> {
  const r = await accountCall<{ ok: boolean; error?: string }>(`invites/${encodeURIComponent(token)}/accept`, { method: "POST" });
  return r.body && typeof r.body.ok === "boolean" ? r.body : { ok: false, error: errorMessage(r.body) };
}

// ---- projects --------------------------------------------------------------------------------

export async function listProjects(opts: { type?: string; order?: "name" | "created"; liveOnly?: boolean } = {}): Promise<Project[]> {
  const params = new URLSearchParams();
  if (opts.type) params.set("type", opts.type);
  if (opts.order === "name") params.set("order", "name");
  if (opts.liveOnly ?? LIVE_ONLY) params.set("liveOnly", "1");
  const q = params.toString();
  return (await apiRequest<{ projects: Project[] }>(`account/projects${q ? `?${q}` : ""}`, { maxRetries: 1 })).projects;
}

/** One project (with its organisation's name), or null when it doesn't exist / isn't yours / isn't live */
export async function getProject(id: string, opts: { liveOnly?: boolean } = {}): Promise<(Project & { company_name: string | null }) | null> {
  const live = opts.liveOnly ?? LIVE_ONLY;
  const r = await accountCall<{ project?: Project & { company_name: string | null } }>(`account/projects/${encodeURIComponent(id)}${live ? "?liveOnly=1" : ""}`);
  return r.ok ? r.body.project || null : null;
}

export async function createProject(input: { name: string; description?: string | null; project_type?: string }): Promise<Project> {
  return (await apiRequest<{ project: Project }>("account/projects", { method: "POST", ...json(input), maxRetries: 1 })).project;
}

export async function updateProject(id: string, fields: { name?: string; description?: string | null }): Promise<Project> {
  return (await apiRequest<{ project: Project }>(`account/projects/${encodeURIComponent(id)}`, { method: "PATCH", ...json(fields), maxRetries: 1 })).project;
}

export async function deleteProject(id: string): Promise<number> {
  return (await apiRequest<{ deleted: number }>(`account/projects/${encodeURIComponent(id)}`, { method: "DELETE", maxRetries: 1 })).deleted;
}

export async function deleteProjectByName(name: string): Promise<number> {
  return (await apiRequest<{ deleted: number }>(`account/projects?name=${encodeURIComponent(name)}`, { method: "DELETE", maxRetries: 1 })).deleted;
}

// ---- join requests ---------------------------------------------------------------------------

/** My latest open (pending / email_sent) or decided (approved / rejected) request */
export async function getMyJoinRequest(status: "open" | "decided" = "open"): Promise<{ id: string; company_name: string; status: string; created_at: string } | null> {
  return (await apiRequest<{ request: any }>(`account/join-requests/mine?status=${status}`, { maxRetries: 1 })).request;
}

export function sendJoinRequest(companyName: string, adminEmail: string) {
  return accountCall<{ success: boolean; error?: string; message?: string }>("account/join-requests", {
    method: "POST",
    ...json({ companyName, adminEmail }),
  });
}

export async function countIncomingJoinRequests(): Promise<number> {
  return (await apiRequest<{ count: number }>("account/join-requests/incoming?count=1", { maxRetries: 1 })).count;
}

export async function listIncomingJoinRequests(): Promise<JoinRequest[]> {
  return (await apiRequest<{ requests: JoinRequest[] }>("account/join-requests/incoming", { maxRetries: 1 })).requests;
}

export async function getJoinRequester(requestId: string): Promise<{ name: string; email: string; phone: string } | null> {
  return (await apiRequest<{ requester: any }>(`account/join-requests/${encodeURIComponent(requestId)}/requester`, { maxRetries: 1 })).requester;
}

/** Approve (with the role the admin picked) or reject, by request id or by the token from an email link */
export function decideJoinRequest(action: "approve" | "reject", ref: { id?: string; token?: string; role?: string }) {
  return accountCall<{ success: boolean; error?: string; message?: string; companyId?: string; role?: string }>(`account/join-requests/${action}`, {
    method: "POST",
    ...json(ref),
  });
}

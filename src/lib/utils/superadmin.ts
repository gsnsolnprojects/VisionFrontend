/**
 * The one superadmin: role platform_admin AND a member of the "gsn" company.
 * UI convenience only — the backend (/api/admin) and database enforce the same rule.
 */
export const isSuperadmin = (role: string | null | undefined, companyName: string | null | undefined): boolean =>
  role === "platform_admin" && (companyName ?? "").trim().toLowerCase() === "gsn";

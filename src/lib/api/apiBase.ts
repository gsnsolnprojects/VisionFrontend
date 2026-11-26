/**
 * API base URL, in this order:
 * 1) explicit VITE_API_BASE_URL from .env
 * 2) the current host on backend port 3000 with /api prefix
 * (Kept in its own file so the login client and the API helpers can both use it.)
 */
const resolveApiBaseUrl = (): string => {
  const envBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  if (typeof window !== "undefined" && window.location?.hostname) {
    const protocol = window.location.protocol || "http:";
    const host = window.location.hostname;
    return `${protocol}//${host}:3000/api`;
  }

  return "";
};

export const API_BASE_URL = resolveApiBaseUrl();

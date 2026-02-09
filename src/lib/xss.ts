/**
 * XSS prevention utilities.
 * - safeText: Escape HTML entities for safe display in text nodes and attributes.
 * - sanitizeUrlParam: Sanitize URL/query/path params to block XSS.
 * - isSafeUrl: Validate URLs to block javascript: and data: schemes.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

/**
 * Escape HTML entities in a string for safe display.
 * Use for all user-controlled strings before rendering.
 * @param str - Raw string (may contain user input)
 * @returns Escaped string safe for text nodes and attributes
 */
export function safeText(str: string | null | undefined): string {
  if (str == null || typeof str !== "string") return "";
  return str.replace(/[&<>"'/]/g, (c) => HTML_ENTITY_MAP[c] ?? c);
}

/** Regex to detect dangerous patterns: <script>, on* handlers, javascript: */
const XSS_PATTERN = /<script\b[\s\S]*?>|<\/script>|on\w+\s*=|javascript\s*:/i;

/**
 * Check if a string contains XSS-dangerous patterns.
 * Used for validation before API calls and when sanitizing params.
 */
export function containsDangerousPattern(str: string | null | undefined): boolean {
  if (str == null || typeof str !== "string") return false;
  return XSS_PATTERN.test(str);
}

/**
 * Sanitize a URL parameter value.
 * Returns empty string if dangerous patterns detected.
 */
export function sanitizeUrlParam(param: string | null | undefined): string {
  if (param == null || typeof param !== "string") return "";
  const trimmed = param.trim();
  if (containsDangerousPattern(trimmed)) return "";
  return trimmed;
}

/**
 * Sanitize URL for href attribute. Blocks javascript: and data: schemes.
 * Returns "#" or empty string for unsafe URLs.
 */
export function sanitizeHref(url: string | null | undefined): string {
  if (url == null || typeof url !== "string") return "#";
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  if (containsDangerousPattern(trimmed)) return "#";
  return trimmed;
}

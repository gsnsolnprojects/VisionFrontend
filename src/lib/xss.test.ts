/**
 * XSS prevention tests.
 * Proves that <script>alert(1)</script> is blocked or escaped everywhere.
 */
import { describe, it, expect } from "vitest";
import { safeText, containsDangerousPattern, sanitizeUrlParam, sanitizeHref } from "./xss";

const XSS_PAYLOAD = "<script>alert(1)</script>";
// safeText escapes & < > " ' / - so </ becomes &lt;&#x2F;
const XSS_PAYLOAD_ESCAPED = "&lt;script&gt;alert(1)&lt;&#x2F;script&gt;";

describe("safeText", () => {
  it("escapes <script> tags", () => {
    expect(safeText(XSS_PAYLOAD)).toBe(XSS_PAYLOAD_ESCAPED);
  });

  it("escapes HTML entities", () => {
    expect(safeText("&")).toBe("&amp;");
    expect(safeText("<")).toBe("&lt;");
    expect(safeText(">")).toBe("&gt;");
    expect(safeText('"')).toBe("&quot;");
    expect(safeText("'")).toBe("&#x27;");
  });

  it("handles null and undefined", () => {
    expect(safeText(null)).toBe("");
    expect(safeText(undefined)).toBe("");
  });

  it("returns safe string that would not execute as HTML", () => {
    const escaped = safeText(XSS_PAYLOAD);
    expect(escaped).not.toContain("<script>");
    expect(escaped).not.toContain("</script>");
    expect(escaped).toContain("&lt;");
    expect(escaped).toContain("&gt;");
  });
});

describe("containsDangerousPattern", () => {
  it("detects <script> tags", () => {
    expect(containsDangerousPattern(XSS_PAYLOAD)).toBe(true);
    expect(containsDangerousPattern("foo <script>bar</script>")).toBe(true);
  });

  it("detects javascript: URLs", () => {
    expect(containsDangerousPattern("javascript:alert(1)")).toBe(true);
    expect(containsDangerousPattern("JAVASCRIPT:alert(1)")).toBe(true);
  });

  it("detects event handlers", () => {
    expect(containsDangerousPattern('onclick="alert(1)"')).toBe(true);
    expect(containsDangerousPattern("onerror=alert(1)")).toBe(true);
  });

  it("allows safe strings", () => {
    expect(containsDangerousPattern("hello world")).toBe(false);
    expect(containsDangerousPattern("Project Alpha")).toBe(false);
    expect(containsDangerousPattern("")).toBe(false);
  });
});

describe("sanitizeUrlParam", () => {
  it("returns empty string for dangerous patterns", () => {
    expect(sanitizeUrlParam(XSS_PAYLOAD)).toBe("");
    expect(sanitizeUrlParam("javascript:alert(1)")).toBe("");
  });

  it("returns trimmed value for safe strings", () => {
    expect(sanitizeUrlParam("abc123")).toBe("abc123");
    expect(sanitizeUrlParam("  valid-token  ")).toBe("valid-token");
  });

  it("handles null and undefined", () => {
    expect(sanitizeUrlParam(null)).toBe("");
    expect(sanitizeUrlParam(undefined)).toBe("");
  });
});

describe("sanitizeHref", () => {
  it("returns # for javascript: URLs", () => {
    expect(sanitizeHref("javascript:alert(1)")).toBe("#");
    expect(sanitizeHref("JAVASCRIPT:void(0)")).toBe("#");
  });

  it("returns # for data: URLs", () => {
    expect(sanitizeHref("data:text/html,<script>alert(1)</script>")).toBe("#");
  });

  it("returns # for dangerous patterns", () => {
    expect(sanitizeHref(XSS_PAYLOAD)).toBe("#");
  });

  it("returns safe URLs unchanged", () => {
    expect(sanitizeHref("/dashboard")).toBe("/dashboard");
    expect(sanitizeHref("https://example.com")).toBe("https://example.com");
  });
});

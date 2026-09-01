/**
 * Validation utilities for augmentation version names.
 * Matches backend regex: ^[a-zA-Z0-9_-]+$
 */

const VERSION_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_LENGTH = 50;

export type VersionNameError =
  | "required"
  | "max_length"
  | "invalid_chars"
  | "same_as_source";

function getSourceVersionString(
  currentVersion: string | number | null | undefined
): string {
  if (currentVersion == null) return "";
  return typeof currentVersion === "number"
    ? `v${currentVersion}`
    : String(currentVersion);
}

export function validateVersionName(
  value: string,
  currentVersion: string | number | null | undefined
): { valid: boolean; error?: VersionNameError; message?: string } {
  const trimmed = value.trim();
  const currentStr = getSourceVersionString(currentVersion);

  if (!trimmed) {
    return { valid: false, error: "required", message: "Version name is required." };
  }
  if (trimmed.length > MAX_LENGTH) {
    return { valid: false, error: "max_length", message: "Version name must be 50 characters or less." };
  }
  if (!VERSION_NAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "invalid_chars",
      message: "Version name may only contain letters, numbers, underscores, and hyphens.",
    };
  }
  if (currentStr && trimmed === currentStr) {
    return {
      valid: false,
      error: "same_as_source",
      message: "Version name cannot be the same as the source version.",
    };
  }
  return { valid: true };
}

export function getSuggestedVersionName(
  currentVersion: string | number | null | undefined,
  suffix: string = "aug"
): string {
  const base = getSourceVersionString(currentVersion) || "v1";
  return `${base}_${suffix}`;
}

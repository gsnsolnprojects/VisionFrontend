/**
 * Zod refinements for XSS prevention.
 * Apply to all string fields that accept user input before API calls.
 */
import { z } from "zod";
import { containsDangerousPattern } from "@/lib/xss";

const XSS_ERROR = "Invalid characters: script tags, event handlers, and javascript: URLs are not allowed";

/**
 * Refine that rejects strings containing <script>, on*, javascript: patterns.
 * Use .refine(xssSafeString) on string schemas.
 */
export const xssSafeString = (val: string) => !containsDangerousPattern(val);

/**
 * Extend a string schema with XSS validation.
 */
export function withXssValidation<T extends z.ZodString>(schema: T) {
  return schema.refine(xssSafeString, { message: XSS_ERROR });
}

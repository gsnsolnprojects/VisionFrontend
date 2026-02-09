import { z } from "zod";
import { withXssValidation } from "./xssSchemas";

// Phone validation rules for different countries
export const phoneRules: Record<string, { length: number; label: string }> = {
  "+1": { length: 10, label: "US" },
  "+44": { length: 10, label: "UK" },
  "+91": { length: 10, label: "India" },
  "+61": { length: 9, label: "Australia" },
  "+49": { length: 10, label: "Germany" },
  "+33": { length: 9, label: "France" },
  "+86": { length: 11, label: "China" },
  "+81": { length: 10, label: "Japan" },
  "+82": { length: 10, label: "South Korea" },
  "+852": { length: 8, label: "Hong Kong" },
  "+853": { length: 8, label: "Macau" },
  "+886": { length: 10, label: "Taiwan" },
  "+90": { length: 10, label: "Turkey" },
  "+92": { length: 10, label: "Pakistan" },
  "+93": { length: 10, label: "Afghanistan" },
  "+94": { length: 10, label: "Sri Lanka" },
  "+95": { length: 10, label: "Myanmar" },
  "+960": { length: 10, label: "Maldives" },
  "+961": { length: 10, label: "Lebanon" },
  "+962": { length: 10, label: "Jordan" },
  "+963": { length: 10, label: "Syria" },
  "+964": { length: 10, label: "Iraq" },
  "+965": { length: 10, label: "Kuwait" },
  "+966": { length: 10, label: "Saudi Arabia" },
  "+967": { length: 10, label: "Yemen" },
  "+968": { length: 10, label: "Oman" },
  "+970": { length: 10, label: "Palestine" },
  "+971": { length: 10, label: "United Arab Emirates" },
  "+972": { length: 10, label: "Israel" },
  "+973": { length: 10, label: "Bahrain" },
  "+974": { length: 10, label: "Qatar" },
  "+975": { length: 10, label: "Bhutan" },
  "+976": { length: 10, label: "Mongolia" },
  "+977": { length: 10, label: "Nepal" },
  "+978": { length: 10, label: "Bhutan" },
};

// Common validators
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address")
  .refine((email) => {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return false;

    // Allow Gmail + company domains, block some common free ones
    if (domain === "gmail.com") return true;
    const blockedFreeDomains = ["yahoo.com", "hotmail.com", "outlook.com"];
    return !blockedFreeDomains.includes(domain);
  }, "Please use Gmail or a company email address");

// Full password schema with all validation rules (for Sign Up and Reset Password)
export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters")
  .max(12, "Password must be at most 12 characters")
  .regex(/[a-z]/, "At least one lowercase letter required")
  .regex(/[A-Z]/, "At least one uppercase letter required")
  .regex(/[0-9]/, "At least one digit required")
  .regex(/[^A-Za-z0-9]/, "At least one symbol required");

// Simple password schema (only required, no format validation - for Sign In)
export const simplePasswordSchema = z
  .string()
  .min(1, "Password is required");

export const nameSchema = withXssValidation(
  z
    .string()
    .min(1, "Name is required")
    .min(3, "Name must be at least 3 characters")
    .max(40, "Name must be at most 40 characters")
    .regex(/^[A-Za-z\s]+$/, "Name must contain only letters and spaces")
);

// Sign Up Schema
export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z.string().min(1, "Phone number is required"),
  countryCode: z.string().min(1, "Country code is required"),
  password: passwordSchema,
});

export type SignupFormData = z.infer<typeof signupSchema>;

// Sign In Schema (uses simplePasswordSchema - no format validation)
export const signinSchema = z.object({
  email: emailSchema,
  password: simplePasswordSchema,
});

export type SigninFormData = z.infer<typeof signinSchema>;

// Reset Password Schema (for forgot password email request)
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Reset Password Form Schema (for setting new password)
export const resetPasswordFormSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type ResetPasswordFormFormData = z.infer<typeof resetPasswordFormSchema>;

// Phone validation helper (used for signup)
export const validatePhoneNumber = (phone: string, countryCode: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  const rule = phoneRules[countryCode];

  if (rule) {
    if (digits.length !== rule.length) {
      return `Phone number must be ${rule.length} digits for ${rule.label}`;
    }
  }

  return null;
};

// Company Name Schema
export const companyNameSchema = withXssValidation(
  z
    .string()
    .min(1, "Company name is required")
    .refine(
    (val) => val.trim().length >= 2,
    "Company name must be at least 2 characters"
  )
  .refine(
    (val) => val.trim().length <= 50,
    "Company name must be at most 50 characters"
  )
  .refine(
    (val) => val.trim().length > 0,
    "Company name cannot be only whitespace"
  )
  .refine(
    (val) => !/^\d+$/.test(val.trim()),
    "Company name cannot be only numbers"
  )
  .refine(
    (val) => /^[a-zA-Z0-9\s\-_&.,()]+$/.test(val.trim()),
    "Company name can only contain letters, numbers, spaces, and common business characters (-, _, &, ., ,, (, ))"
  )
);

// Company Details Schema
export const companyDetailsSchema = z.object({
  companyName: companyNameSchema,
  businessEmail: emailSchema,
});

export type CompanyDetailsFormData = z.infer<typeof companyDetailsSchema>;

// Project Schema
export const projectSchema = z.object({
  projectName: withXssValidation(
    z
      .string()
      .min(1, "Project name is required")
      .min(2, "Project name must be at least 2 characters")
      .max(30, "Project name must be at most 30 characters")
  ),
  projectDescription: withXssValidation(z.string().max(500, "Description must be at most 500 characters")).optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// Invite User Schema
export const inviteUserSchema = z.object({
  email: emailSchema,
  name: withXssValidation(z.string().max(100, "Name must be at most 100 characters")).optional(),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;

// Phone validation for User Profile (single field, no country selector)
// Allows: optional + at start, digits, spaces, hyphens. Rejects letters/symbols.
const phoneProfileSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (val) => /^[\d\s\-+]+$/.test(val.trim()),
    "Phone number can only contain digits, +, spaces, and hyphens"
  )
  .refine((val) => {
    const digits = val.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }, "Phone number must be 10–15 digits");

// User Profile Schema
export const userProfileSchema = z.object({
  name: nameSchema,
  phone: phoneProfileSchema,
  companyName: withXssValidation(z.string().max(100, "Company name must be at most 100 characters")).optional(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;

// Class name schema for dataset categories (ClassNameDialog)
export const classNameSchema = withXssValidation(
  z.string().max(50, "Class name must be at most 50 characters")
);


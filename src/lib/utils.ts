import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// XSS-safe text utility - re-export for convenience
export { safeText } from "@/lib/xss";

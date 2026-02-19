import type { UserRole } from "@/types/roles";

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  platform_admin: "Platform Admin",
  workspace_admin: "Workspace Admin",
  ml_engineer: "ML Engineer",
  operator: "Operator",
  viewer: "Viewer",
  admin: "Workspace Admin",
  member: "Viewer",
};

export function getRoleDisplayName(role: string | undefined | null): string {
  if (!role) return "Viewer";
  return ROLE_DISPLAY_NAMES[role] || role;
}

export function getRoleBadgeVariant(role: UserRole | string | null | undefined): string {
  switch (role) {
    case "platform_admin":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "workspace_admin":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case "ml_engineer":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30";
    case "operator":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "viewer":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

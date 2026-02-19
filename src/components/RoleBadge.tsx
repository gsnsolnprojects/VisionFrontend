import React from "react";
import { cn } from "@/lib/utils";
import { getRoleDisplayName, getRoleBadgeVariant } from "@/lib/utils/roleUtils";
import type { UserRole } from "@/types/roles";

interface RoleBadgeProps {
  role: UserRole | string | null | undefined;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className }) => {
  if (!role) return null;

  const displayName = getRoleDisplayName(role);
  const variantClasses = getRoleBadgeVariant(role);

  return (
    <span
      className={cn(
        "inline-flex items-center h-5 rounded-md border px-2 py-0.5 text-xs font-medium leading-none",
        variantClasses,
        className
      )}
    >
      {displayName}
    </span>
  );
};

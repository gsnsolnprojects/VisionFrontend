import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanAccess, BILLING_ROUTE } from "@/contexts/plan-access-context";
import { useWorkspaceKind } from "@/lib/workspaceKind";

/** Shown across the app while the company has no active plan (view-only) */
export const PlanRequiredBanner: React.FC = () => {
  const { isViewOnly, data } = usePlanAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const preview = useWorkspaceKind() === "preview";

  if (!isViewOnly || preview) return null;

  const canManage = !!data?.billing?.canManage;
  const lapsed = data?.access?.reason && !["no_plan", "none"].includes(data.access.reason);

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="text-sm">
          <p className="font-medium">
            {lapsed ? "Your plan is no longer active" : "Choose a plan to start using Vision-M"}
          </p>
          <p className="text-muted-foreground">
            {canManage
              ? "You can look around, but creating projects, adding datasets, labelling, training and inference need an active plan."
              : "You can look around. Ask your workspace admin to choose a plan to unlock projects, labelling, training and inference."}
          </p>
        </div>
      </div>
      {canManage && location.pathname !== BILLING_ROUTE && (
        <Button size="sm" className="shrink-0" onClick={() => navigate(BILLING_ROUTE)}>
          Choose a plan
        </Button>
      )}
    </div>
  );
};

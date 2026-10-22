import React, { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePlanAccess } from "@/contexts/plan-access-context";
import { LoadingState } from "@/components/pages/LoadingState";
import DatasetManager from "@/pages/DatasetManager";
import PlaygroundProjectPage from "@/pages/PlaygroundProjectPage";

/** How long to wait for the plan before falling back to the full dataset manager */
const PLAN_WAIT_MS = 8000;

/**
 * /dataset/:id - Playground workspaces get the guided project screen; GSN and the other plans
 * keep the full dataset manager.
 */
const ProjectDatasetRoute: React.FC = () => {
  const { company, profile } = useProfile();
  const planAccess = usePlanAccess();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setGaveUp(true), PLAN_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const waiting = !!profile?.company_id && (!company || (!planAccess.data && (planAccess.loading || !gaveUp)));
  if (waiting) return <LoadingState message="Loading your project..." />;

  const isPlayground =
    planAccess.data?.access?.plan === "playground" && (company?.name ?? "").trim().toLowerCase() !== "gsn";
  return isPlayground ? <PlaygroundProjectPage /> : <DatasetManager />;
};

export default ProjectDatasetRoute;

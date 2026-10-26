import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { staggerContainerVariants } from "@/utils/animations";
import { usePlanAccess, BILLING_ROUTE } from "@/contexts/plan-access-context";
import { getLearningProgress, type LearningProgress } from "@/lib/api/dashboard";
import { IndustryPicker, type Mission, type MissionMode } from "./IndustryPicker";
import { SpotTheIssueQuiz } from "./SpotTheIssueQuiz";
import { AllowanceMeters } from "./AllowanceMeters";
import { PlaygroundIncluded } from "./PlaygroundIncluded";

interface PlaygroundOverviewProps {
  projects: unknown[];
  onCreateProject?: () => void;
  /** Creates (or opens) the mission's project: guided, quick try (GSN's model) or own images */
  onStartMission?: (industryName: string, mission: Mission, mode: MissionMode) => void;
  /** Before a plan is chosen: look around only; start buttons lead to Plan & billing */
  preview?: boolean;
}

/**
 * Overview for Playground workspaces: pick an industry and a challenge, a quick spot-the-defect
 * warm-up, and the workspace's allowance. Other plans keep the regular DashboardOverview.
 * With `preview` (no plan yet) it is informative: the challenges can be browsed but not started,
 * and "What's included" replaces the allowance.
 */
export const PlaygroundOverview: React.FC<PlaygroundOverviewProps> = ({ projects, onCreateProject, onStartMission, preview = false }) => {
  const navigate = useNavigate();
  const planAccess = usePlanAccess();
  const [progress, setProgress] = useState<LearningProgress | null>(null);

  const load = useCallback(async () => {
    try {
      setProgress(await getLearningProgress());
    } catch {
      setProgress(null);
    }
  }, []);

  useEffect(() => {
    if (!preview) void load();
  }, [load, preview]);

  const choosePlan = () => navigate(BILLING_ROUTE);

  const projectsUsed = planAccess.data?.usage?.projects ?? projects.length;

  return (
    <motion.div className="space-y-8" variants={staggerContainerVariants} initial="hidden" animate="visible">
      <IndustryPicker
        onChoosePlan={preview ? choosePlan : undefined}
        onStartMission={(industryName, mission, mode) =>
          onStartMission
            ? onStartMission(industryName, mission, mode)
            : onCreateProject
              ? onCreateProject()
              : navigate("/dashboard?action=create-project")
        }
      />

      <SpotTheIssueQuiz />

      {preview ? (
        <PlaygroundIncluded
          plan={planAccess.data?.plans?.find((p) => p.id === "playground") ?? null}
          onChoosePlan={choosePlan}
        />
      ) : (
        <AllowanceMeters
          limits={planAccess.data?.access?.limits ?? null}
          projectsUsed={planAccess.data ? projectsUsed : null}
          storedImages={progress?.storedImages ?? null}
          trainingRunsThisMonth={progress?.trainingRunsThisMonth ?? null}
          predictionsThisMonth={progress?.predictionsThisMonth ?? null}
        />
      )}
    </motion.div>
  );
};

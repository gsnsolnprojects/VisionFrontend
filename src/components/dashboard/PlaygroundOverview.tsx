import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUpVariants, staggerContainerVariants } from "@/utils/animations";
import { usePlanAccess, BILLING_ROUTE } from "@/contexts/plan-access-context";
import { getLearningProgress, type LearningProgress } from "@/lib/api/dashboard";
import { getLevels, type LevelProgress } from "@/lib/api/levels";
import { IndustryPicker, type Mission, type MissionMode } from "./IndustryPicker";
import { SpotTheIssueQuiz } from "./SpotTheIssueQuiz";
import { AllowanceMeters } from "./AllowanceMeters";
import { ContinueLevelCard } from "./ContinueLevelCard";
import { BadgeShelf, JourneyMap, LevelCompleteCard, PlaygroundWelcome } from "./PlaygroundJourney";
import { PlaygroundIncluded } from "./PlaygroundIncluded";

interface PlaygroundOverviewProps {
  projects: unknown[];
  /** The project list is in (Continue needs it to tell if a level's project still exists) */
  projectsLoaded?: boolean;
  onCreateProject?: () => void;
  /** Creates (or opens) the mission's project: guided, quick try (GSN's model) or own images */
  onStartMission?: (industryName: string, mission: Mission, mode: MissionMode) => void;
  /** Before a plan is chosen: look around only; start buttons lead to Plan & billing */
  preview?: boolean;
}

/**
 * Overview for Playground workspaces: a welcome for someone new, or where a returning student is
 * (with the card for a level just finished), their journey and badges, then pick an industry and a
 * challenge, a quick spot-the-defect warm-up, and the workspace's allowance. Other plans keep the
 * regular DashboardOverview.
 * With `preview` (no plan yet) it is informative: the challenges can be browsed but not started,
 * and "What's included" replaces the allowance.
 */
export const PlaygroundOverview: React.FC<PlaygroundOverviewProps> = ({ projects, projectsLoaded = false, onCreateProject, onStartMission, preview = false }) => {
  const navigate = useNavigate();
  const planAccess = usePlanAccess();
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [levels, setLevels] = useState<LevelProgress[] | null>(null);

  const load = useCallback(async () => {
    try {
      setProgress(await getLearningProgress());
    } catch {
      setProgress(null);
    }
    getLevels()
      .then((json) => setLevels(json.levels))
      .catch(() => setLevels([]));
  }, []);

  useEffect(() => {
    if (!preview) void load();
  }, [load, preview]);

  const choosePlan = () => navigate(BILLING_ROUTE);

  const projectsUsed = planAccess.data?.usage?.projects ?? projects.length;

  const projectIds = (projects as { id: string }[]).map((p) => p.id);
  // A Level 2 whose project was deleted is gone: it isn't shown or counted
  const liveLevels = levels?.filter((l) => l.level === 1 || projectIds.includes(l.projectId ?? "")) ?? null;
  const latest = liveLevels?.[0];
  const justFinished = latest?.finishedAt ? latest : null;
  const isNew = !preview && !!liveLevels && projectsLoaded && !liveLevels.some((l) => l.completedSteps.length > 0);

  return (
    <motion.div className="space-y-8" variants={staggerContainerVariants} initial="hidden" animate="visible">
      {(preview || isNew) && <PlaygroundWelcome onChoosePlan={preview ? choosePlan : undefined} />}

      {justFinished && projectsLoaded && <LevelCompleteCard key={`${justFinished.mission}-${justFinished.finishedAt}`} level={justFinished} onNext={() => document.getElementById("pick-industry")?.scrollIntoView({ behavior: "smooth", block: "start" })} />}

      {!preview && onStartMission && projectsLoaded && levels && (
        <ContinueLevelCard
          levels={levels}
          projectIds={projectIds}
          onStartMission={onStartMission}
        />
      )}

      {!preview && liveLevels && projectsLoaded && (
        <motion.section variants={fadeInUpVariants} aria-label="Your journey and badges" className="space-y-5 rounded-2xl border bg-card p-5 md:p-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Your journey</h2>
            <JourneyMap levels={liveLevels} />
          </div>
          <BadgeShelf levels={liveLevels} progress={progress} />
        </motion.section>
      )}

      <IndustryPicker
        onChoosePlan={preview ? choosePlan : undefined}
        path={preview ? null : progress?.path ?? null}
        levels={preview ? null : levels}
        projectIds={projectIds}
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

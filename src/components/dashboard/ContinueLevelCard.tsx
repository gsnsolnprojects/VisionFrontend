import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LevelProgress } from "@/lib/api/levels";
import { fadeInUpVariants } from "@/utils/animations";
import { cn } from "@/lib/utils";
import type { Mission, MissionMode } from "./IndustryPicker";

/**
 * Top of the Playground overview: the unfinished level the student touched last, with "Continue"
 * to its next step. Hidden when there is none.
 */

const STEP_NAMES: Record<string, string> = {
  dataset: "See the data",
  practice: "Labelling",
  training: "How training works",
  upload: "Upload",
  label: "Label",
  train: "Train",
  test: "Test",
  report: "Report",
};

const STEP_NEXT: Record<string, string> = {
  dataset: "Look through the sample photos and their labels.",
  practice: "Try labelling real inspection photos.",
  training: "See how a model gets trained.",
  upload: "Upload your own photos.",
  label: "Label at least 20 of your photos.",
  train: "Train your model.",
  test: "Test the model on photos it has never seen.",
  report: "Make your report.",
};

/** The project page's ?step= for a Level 2 step (Level 1 has its own page) */
const PAGE_STEP: Record<string, string | null> = {
  upload: null,
  label: null,
  train: "train",
  test: "test",
  report: "report",
};

const nextLine = (level: LevelProgress) => {
  const status = level.training?.status;
  if (status === "queued" || status === "running") return "Your model is still training. Check how far it has got.";
  if (status === "failed" || status === "cancelled") return "Your last training run didn't finish. Try it again.";
  const next = STEP_NEXT[level.nextStep ?? ""] ?? "";
  return status === "completed" && !level.completedSteps.includes("test")
    ? `Your model finished training. Next: ${next.charAt(0).toLowerCase()}${next.slice(1)}`
    : next;
};

export const ContinueLevelCard: React.FC<{
  levels: LevelProgress[];
  projectIds: string[];
  onStartMission: (industryName: string, mission: Mission, mode: MissionMode) => void;
}> = ({ levels, projectIds, onStartMission }) => {
  const navigate = useNavigate();
  // A Level 2 whose project was deleted has nothing to continue
  const level = levels.find((l) => !l.finishedAt && l.nextStep && (l.level === 1 || projectIds.includes(l.projectId ?? "")));

  if (!level) return null;

  const resume = () => {
    const mission: Mission = { title: level.mission, sample: level.sample ?? undefined };
    const industry = level.industry ?? "";
    if (level.level === 1) {
      onStartMission(industry, mission, "guided");
      return;
    }
    const pageStep = PAGE_STEP[level.nextStep ?? ""];
    navigate(`/dataset/${level.projectId}${pageStep ? `?step=${pageStep}` : ""}`);
  };

  return (
    <motion.section
      variants={fadeInUpVariants}
      initial="hidden"
      animate="visible"
      aria-labelledby="continue-heading"
      className="rounded-2xl border bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Level {level.level} · Continue where you left off
          </p>
          <h2 id="continue-heading" className="mt-1 text-lg font-semibold text-foreground">
            {level.mission}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{nextLine(level)}</p>
        </div>
        <Button className="gap-1.5" onClick={resume}>
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <ol className="mt-4 flex flex-wrap gap-2" aria-label="Steps in this level">
        {level.steps.map((step) => {
          const done = level.completedSteps.includes(step);
          const current = step === level.nextStep;
          return (
            <li
              key={step}
              aria-current={current ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                done && "border-success/40 bg-success/10 text-foreground",
                current && "border-ring bg-secondary font-medium text-foreground",
                !done && !current && "text-muted-foreground"
              )}
            >
              {done && <Check className="h-3 w-3 text-success" aria-hidden="true" />}
              {STEP_NAMES[step] ?? step}
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
};

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
  dataset: "Look through GSN's real inspection photos and see how each defect is marked. You'll also see why photos are split into sets for learning, checking and testing.",
  practice: "Draw boxes around the defects on real photos, and your boxes are checked against GSN's labels. Do as many as you like, even one or two.",
  training: "Learn what happens when a model trains and what each setting means, so you're ready to train your own in Level 2.",
  upload: "Add photos of the part you want to inspect, some with the defect and some without. You'll need at least 20, and more is better.",
  label: "Draw a box around the defect on at least 20 photos. The model learns only from your boxes, so this decides how good it gets. Photos with no defect can be marked as good.",
  train: "Pick a model size and start training. The model studies your labelled photos again and again until it can spot the defect by itself. It keeps going if you leave, so you can come back to it.",
  test: "Run the model on photos it never learned from, and compare what it found with the labels. This shows how good it really is, and which defects it misses.",
  report: "Turn your test into a report that shows each photo, what the model found and what the labels say. In a factory, this is how results get shared with the team. Reports are kept for 24 hours, so download the ones you want.",
};

/** The project page's ?step= for a Level 2 step (Level 1 has its own page) */
const PAGE_STEP: Record<string, string | null> = {
  upload: null,
  label: null,
  train: "train",
  test: "test",
  report: "report",
};

/** What the student does next, in a heading and a few plain lines */
const nextUp = (level: LevelProgress) => {
  const status = level.training?.status;
  if (status === "queued" || status === "running") {
    return { title: "Your model is training", text: "It keeps going while you're away. Open it to see how far it has got. Next, you'll test it on photos it never learned from." };
  }
  if (status === "failed" || status === "cancelled") {
    return { title: "Next: Train again", text: "Your last training run didn't finish. Open it to see why and start it again." };
  }
  const step = level.nextStep ?? "";
  const text = STEP_NEXT[step] ?? "";
  const title = `Next: ${STEP_NAMES[step] ?? step}`;
  return status === "completed" && !level.completedSteps.includes("test")
    ? { title, text: `Your model finished training. ${text}` }
    : { title, text };
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

  const next = nextUp(level);

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
          <p className="mt-3 text-sm font-medium text-foreground">{next.title}</p>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{next.text}</p>
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

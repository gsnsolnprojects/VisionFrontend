import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Cpu,
  CupSoda,
  Hexagon,
  Lock,
  Pill,
  Plug,
  Shirt,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { fadeInUpVariants } from "@/utils/animations";
import { IndustryArt } from "@/components/landing/IndustryArt";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { getSamples, type SampleDataset, type SampleModel } from "@/lib/api/samples";
import type { PathProgress } from "@/lib/api/dashboard";
import type { LevelProgress } from "@/lib/api/levels";
import { cn } from "@/lib/utils";

/**
 * Top of the Playground overview: "Pick a world" hero, the six industry cards and the picked
 * industry's levels (Level 1 on a GSN sample, Level 2 on the student's own photos, in a project they
 * name themselves). Either can be started first; Level 2 only suggests Level 1 to someone who hasn't done one.
 * The picked industry is remembered per user in this browser and drives the drawings (same
 * drawings as the landing page, in the same order).
 */

export interface Mission {
  /** Project name for this mission */
  title: string;
  /** GSN sample dataset (its project name in the sample library) that guided and quick-try start with */
  sample?: string;
}

/**
 * guided: Level 1 on GSN's sample; practice: Level 1's practice step; try: GSN's trained model on your
 * photos; own: Level 2, your images
 */
export type MissionMode = "practice" | "guided" | "try" | "own";

interface Industry {
  id: string;
  name: string;
  tagline: string;
  Icon: LucideIcon;
  /** Which drawing is this industry's (the landing page's order) */
  art: number;
  /** The one we suggest starting with */
  recommended?: boolean;
  /** Guided challenge on a GSN sample (the quick try uses the same project and sample) */
  guided?: { title: string; sample: string; finds: string; photoNoun: string };
  /** An example defect, for the student's own project */
  own: { example: string };
}

const INDUSTRIES: Industry[] = [
  {
    id: "electronics",
    name: "Electronics & PCB",
    tagline: "Tiny components. Big inspection questions.",
    Icon: Cpu,
    art: 1,
    recommended: true,
    guided: {
      title: "PCB defect detective",
      sample: "PCB",
      finds: "missing holes, shorts, open circuits, spurs and more",
      photoNoun: "circuit board",
    },
    own: { example: "a missing component or a solder bridge" },
  },
  {
    // id kept as "automotive" so browsers that remembered this card still pick it
    id: "automotive",
    name: "Electrical Components",
    tagline: "Terminals, connectors and switchgear.",
    Icon: Plug,
    art: 0,
    guided: {
      title: "Missing screw detective",
      sample: "Terminals",
      finds: "missing screws, missing bars and blackened parts",
      photoNoun: "terminal",
    },
    own: { example: "a missing screw or a cracked housing" },
  },
  {
    id: "pharma",
    name: "Pharma Packaging",
    tagline: "Explore what makes packaging acceptable.",
    Icon: Pill,
    art: 2,
    guided: {
      title: "Blister pack inspector",
      sample: "Blister Pack",
      finds: "empty and damaged pockets",
      photoNoun: "blister pack",
    },
    own: { example: "an empty pocket or a torn foil" },
  },
  {
    id: "food",
    name: "Food & Beverages",
    tagline: "Explore the details behind everyday packs.",
    Icon: CupSoda,
    art: 3,
    own: { example: "a crooked label or a dented can" },
  },
  {
    id: "plastics",
    name: "Plastics & Precision Parts",
    tagline: "Investigate shape, finish and consistency.",
    Icon: Hexagon,
    art: 4,
    own: { example: "an incomplete moulding or a surface scratch" },
  },
  {
    id: "textiles",
    name: "Textiles",
    tagline: "Look closer at patterns, stains and fabric.",
    Icon: Shirt,
    art: 5,
    own: { example: "a stain or a pulled thread" },
  },
];

const sameProject = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The guided challenge that uses a GSN sample (by its project name), to start it from elsewhere */
export const guidedMissionForSample = (sampleProject: string): { industryName: string; mission: Mission } | null => {
  const industry = INDUSTRIES.find((i) => i.guided && sameProject(i.guided.sample, sampleProject));
  return industry?.guided
    ? { industryName: industry.name, mission: { title: industry.guided.title, sample: industry.guided.sample } }
    : null;
};

const storageKey = (userId?: string) => `visionm_playground_industry_${userId ?? "anon"}`;

const readIndustry = (userId?: string): string | null => {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
};

type Samples = { datasets: SampleDataset[]; models: SampleModel[] };

export const IndustryPicker: React.FC<{
  onStartMission: (industryName: string, mission: Mission, mode: MissionMode) => void;
  /** Before a plan is chosen: start buttons become "Unlocks with Playground" and lead here */
  onChoosePlan?: () => void;
  /** Challenge-path progress; null while loading (or before a plan): no locks shown */
  path?: PathProgress | null;
  /** The student's levels; null while loading (or before a plan) */
  levels?: LevelProgress[] | null;
  /** The company's projects: a Level 2 whose project was deleted starts afresh */
  projectIds?: string[];
}> = ({ onStartMission, onChoosePlan, path = null, levels = null, projectIds = [] }) => {
  const { user } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);
  const [samples, setSamples] = useState<Samples | null>(null);

  useEffect(() => {
    setSelected(readIndustry(user?.id));
  }, [user?.id]);

  // No level started (a new or reset account): a choice from an earlier go doesn't count
  const pickedHere = useRef(false);
  useEffect(() => {
    if (levels?.length !== 0 || pickedHere.current) return;
    setSelected(null);
    try {
      localStorage.removeItem(storageKey(user?.id));
    } catch {
      // Remembering the choice is a convenience only
    }
  }, [levels, user?.id]);

  // Which GSN samples and ready-made models exist decides which cards are live or "coming soon"
  useEffect(() => {
    getSamples()
      .then(setSamples)
      .catch(() => setSamples({ datasets: [], models: [] }));
  }, []);

  const pick = (id: string) => {
    pickedHere.current = true;
    setSelected(id);
    try {
      localStorage.setItem(storageKey(user?.id), id);
    } catch {
      // Remembering the choice is a convenience only
    }
  };

  const artIndex = INDUSTRIES.find((i) => i.id === selected)?.art ?? INDUSTRIES[0].art;
  const industry = INDUSTRIES.find((i) => i.id === selected);

  /** Down to the picked industry's levels, or to the industries while none is picked */
  const goToLevels = () =>
    document.getElementById(industry ? "pick-level" : "pick-industry")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      {/* Hero */}
      <motion.section
        variants={fadeInUpVariants}
        aria-label="Vision-M Playground"
        className="overflow-hidden rounded-2xl bg-[#171f1b] text-[#f5f5ee]"
      >
        <div className="grid items-center gap-8 p-6 md:p-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bec9b0]">
              GSN · Vision-M Playground
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
              Pick a world.
              <br />
              <span className="text-[#e9ff65]">Teach AI to see it.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[#bec9b0] md:text-base">
              From the circuit board in your phone to the parts in a car. Turn your curiosity into an inspection
              project.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs">
              {["6 industry worlds", "No code needed", "Learn by experimenting"].map((chip) => (
                <li key={chip} className="rounded-full border border-[#485840] px-3 py-1.5 text-[#f5f5ee]">
                  {chip}
                </li>
              ))}
            </ul>
            {onChoosePlan && (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button onClick={onChoosePlan} className="gap-1.5 bg-[#e9ff65] text-[#171f1b] hover:bg-[#e9ff65]/90">
                  Choose Playground · ₹999/month
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="text-xs text-[#bec9b0]">Look around first: pick a world below to see its challenges.</span>
              </div>
            )}
            {!onChoosePlan && (
              <Button onClick={goToLevels} className="mt-7 gap-1.5 bg-[#e9ff65] text-[#171f1b] hover:bg-[#e9ff65]/90">
                Start guided mission
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="relative hidden overflow-hidden rounded-xl border border-[#485840] p-2 sm:block">
            <IndustryArt index={artIndex} />
            {/* Scanner line sweeping over the picture, like an inspection camera */}
            <div aria-hidden className="scan-line pointer-events-none absolute inset-x-2" />
          </div>
        </div>
      </motion.section>

      {/* Industry cards */}
      <motion.section id="pick-industry" variants={fadeInUpVariants} aria-labelledby="industry-heading" className="scroll-mt-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              01 / Choose your industry
            </p>
            <h3 id="industry-heading" className="mt-1 text-lg font-semibold text-foreground">
              Where will curiosity take you?
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">Choose one to unlock challenges</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Industry">
          {INDUSTRIES.map(({ id, name, tagline, Icon, recommended }, i) => {
            const isSelected = id === selected;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => pick(id)}
                className={cn(
                  "group relative flex min-h-[160px] flex-col rounded-xl border bg-card p-5 text-left transition-colors",
                  "hover:border-ring/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected && "border-ring bg-secondary/60 ring-1 ring-ring"
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {recommended && (
                    <span className="rounded-full bg-[#e9ff65] px-2.5 py-1 text-[11px] font-semibold text-[#171f1b]">Recommended</span>
                  )}
                </span>
                <span className="absolute right-4 top-4 text-muted-foreground" aria-hidden="true">
                  {isSelected ? (
                    <Check className="h-4 w-4 text-ring" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  )}
                </span>
                <span className="mt-auto pt-6 font-semibold text-foreground">{name}</span>
                <span className="mt-1 text-sm text-muted-foreground">{tagline}</span>
                <span className="mt-2 self-end font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  World / {String(i + 1).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* Challenges for the picked industry */}
      {industry && (
        <Challenges
          industry={industry}
          samples={samples}
          onStartMission={onStartMission}
          onChoosePlan={onChoosePlan}
          path={path}
          levels={levels}
          projectIds={projectIds}
        />
      )}
    </>
  );
};

/** Where a card is on the challenge path */
type PathStep = { state: "done" | "next" };

const PathBadge: React.FC<{ state: PathStep["state"] }> = ({ state }) =>
  state === "done" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
      <Check className="h-3 w-3" aria-hidden="true" /> Done
    </span>
  ) : (
    <span className="rounded-full bg-[#e9ff65] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#171f1b]">
      Next
    </span>
  );

/** A challenge card's frame: label, picture, title, text and the action (or "coming soon") */
const ChallengeCard: React.FC<{
  kicker: string;
  picture: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void; primary?: boolean; Icon: LucideIcon };
  soon?: string;
  /** Before a plan is chosen: the action is replaced by "Unlocks with Playground" */
  onLocked?: () => void;
  step?: PathStep | null;
}> = ({ kicker, picture, title, children, action, soon, onLocked, step }) => {
  return (
  <article className={cn("flex flex-col rounded-xl border bg-background/40 p-4", soon && "opacity-75")}>
    <div className="flex min-h-5 items-center justify-between gap-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{kicker}</p>
      {step && !soon && !onLocked && <PathBadge state={step.state} />}
    </div>
    <div className="mt-3 aspect-[25/13] overflow-hidden rounded-lg bg-[#171f1b]">{picture}</div>
    <h4 className="mt-4 font-semibold text-foreground">{title}</h4>
    <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
    <div className="mt-auto pt-5">
      {soon ? (
        <Button variant="outline" className="w-full gap-1.5" disabled>
          <Clock className="h-4 w-4" aria-hidden="true" />
          {soon}
        </Button>
      ) : onLocked ? (
        <Button variant="outline" className="w-full gap-1.5" onClick={onLocked}>
          <Lock className="h-4 w-4" aria-hidden="true" />
          Unlocks with Playground
        </Button>
      ) : (
        action && (
          <Button variant={action.primary ? "default" : "outline"} className="w-full gap-1.5" onClick={action.onClick}>
            {action.label}
            <action.Icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        )
      )}
    </div>
  </article>
  );
};

/** What the student will do in a level, in order */
const LevelSteps: React.FC<{ steps: string[] }> = ({ steps }) => (
  <ol className="mt-3 space-y-1.5">
    {steps.map((step, i) => (
      <li key={step} className="flex gap-2">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium text-foreground">
          {i + 1}
        </span>
        <span>{step}</span>
      </li>
    ))}
  </ol>
);

/** Lime tag in a card picture's top-left corner */
const Tag: React.FC<{ Icon: LucideIcon; children: React.ReactNode }> = ({ Icon, children }) => (
  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-[#e9ff65] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#171f1b]">
    <Icon className="h-3 w-3" aria-hidden="true" /> {children}
  </span>
);

const Challenges: React.FC<{
  industry: Industry;
  samples: Samples | null;
  onStartMission: (industryName: string, mission: Mission, mode: MissionMode) => void;
  onChoosePlan?: () => void;
  path: PathProgress | null;
  levels: LevelProgress[] | null;
  projectIds: string[];
}> = ({ industry, samples, onStartMission, onChoosePlan, path, levels, projectIds }) => {
  const artIndex = industry.art;
  const guided = industry.guided;
  const loading = samples === null;
  const sample = guided ? samples?.datasets.find((d) => sameProject(d.project, guided.sample)) : undefined;
  const guidedMission: Mission | null = guided ? { title: guided.title, sample: guided.sample } : null;
  const startGuided = () => {
    if (guidedMission) onStartMission(industry.name, guidedMission, "guided");
  };

  // Level 1 of this industry, and whether any Level 1 is done (older accounts: the old guided path)
  const levelOne = guided ? levels?.find((l) => l.level === 1 && l.mission === guided.title) : undefined;
  const anyLevelOneDone = !!levels?.some((l) => l.level === 1 && l.finishedAt) || !!(path?.guidedDone && path.practiceDone);
  const levelTwo = levels?.find((l) => l.level === 2 && projectIds.includes(l.projectId ?? ""));
  const guidedStep: PathStep | null = levels ? { state: levelOne?.finishedAt ? "done" : "next" } : null;
  const ownStep: PathStep | null = !levels ? null : { state: levelTwo?.finishedAt ? "done" : "next" };
  const showLevelOneTip = !!guidedMission && !levelTwo?.finishedAt && !levelTwo?.completedSteps.length && !anyLevelOneDone;

  return (
    <motion.section
      key={industry.id}
      id="pick-level"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="challenge-heading"
      className="scroll-mt-4 rounded-2xl border bg-card p-5 md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            02 / Pick your level
          </p>
          <h3 id="challenge-heading" className="mt-1 text-lg font-semibold text-foreground">
            {industry.name}: what will you inspect?
          </h3>
        </div>
        <span className="rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
          Find &amp; mark defects
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Learn on a GSN sample first, step by step. Then build your own model on your own photos.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Level 1: learning on GSN's labelled sample */}
        <ChallengeCard
          kicker="Level 1 · Learn on a sample"
          title={guided?.title ?? "Learn on a sample"}
          picture={
            <div className="relative h-full w-full">
              <IndustryArt index={artIndex} highlight="labelled" />
              <Tag Icon={Sparkles}>Labelled by GSN</Tag>
            </div>
          }
          soon={!guided || (!loading && !sample) ? "Level 1 coming soon" : undefined}
          onLocked={onChoosePlan}
          step={guidedStep}
          action={
            guidedMission
              ? {
                  label: levelOne?.finishedAt ? "Open Level 1 again" : levelOne ? "Continue Level 1" : "Start Level 1",
                  primary: true,
                  Icon: ArrowRight,
                  onClick: startGuided,
                }
              : undefined
          }
        >
          {guided && sample ? (
            <>
              Learn how AI inspection works on {sample.totalImages} real {guided.photoNoun} photos that GSN has already
              labelled.
              <LevelSteps
                steps={[
                  `See the photos and how defects like ${guided.finds} are marked`,
                  "Try marking defects yourself and get a score",
                  "Learn how a model is trained",
                  "Test GSN's ready-made model and make a report",
                ]}
              />
            </>
          ) : (
            "We're preparing a labelled GSN dataset for this industry."
          )}
        </ChallengeCard>

        {/* Level 2: the student's own project: their photos, their labels, their model */}
        <ChallengeCard
          kicker="Level 2 · Your own model"
          title="Your own inspection"
          picture={
            <div className="relative h-full w-full">
              <IndustryArt index={artIndex} />
              <Tag Icon={Sparkles}>Your photos</Tag>
            </div>
          }
          onLocked={onChoosePlan}
          step={ownStep}
          action={{
            label: levelTwo?.finishedAt ? "Open Level 2 again" : levelTwo?.completedSteps.length ? "Continue Level 2" : "Start Level 2",
            Icon: ArrowRight,
            onClick: () => onStartMission(industry.name, { title: "Level 2" }, "own"),
          }}
        >
          Build a model that finds a defect you choose, for example {industry.own.example}, using your own photos.
          <LevelSteps
            steps={[
              "Name your project and upload your photos",
              "Mark the defect on at least 20 of them",
              "Train your own model",
              "Test it on new photos and make a report",
            ]}
          />
          {showLevelOneTip && <span className="mt-2 block text-xs">New to this? Level 1 is a helpful place to start.</span>}
        </ChallengeCard>
      </div>
    </motion.section>
  );
};

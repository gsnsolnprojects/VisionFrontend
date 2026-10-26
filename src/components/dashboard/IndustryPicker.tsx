import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
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
  Upload,
  type LucideIcon,
} from "lucide-react";
import { fadeInUpVariants } from "@/utils/animations";
import { IndustryArt } from "@/components/landing/IndustryArt";
import { Button } from "@/components/ui/button";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { useProfile } from "@/hooks/useProfile";
import { getSamples, sampleDatasetThumbnailUrl, type SampleDataset, type SampleModel } from "@/lib/api/samples";
import { cn } from "@/lib/utils";

/**
 * Top of the Playground overview: "Pick a world" hero, the six industry cards and the picked
 * industry's three challenges (guided sample, quick try of GSN's trained model, own project).
 * The picked industry is remembered per user in this browser and drives the drawings (same
 * drawings as the landing page, in the same order).
 */

export interface Mission {
  /** Project name for this mission */
  title: string;
  /** GSN sample dataset (its project name in the sample library) that guided and quick-try start with */
  sample?: string;
}

/** guided: labelled sample to explore and train on; try: GSN's trained model on your photos; own: your images */
export type MissionMode = "guided" | "try" | "own";

interface Industry {
  id: string;
  name: string;
  tagline: string;
  Icon: LucideIcon;
  /** Guided challenge on a GSN sample (the quick try uses the same project and sample) */
  guided?: { title: string; sample: string; finds: string; photoNoun: string };
  /** The student's own project: its name and an example defect to start with */
  own: { title: string; example: string };
}

const INDUSTRIES: Industry[] = [
  {
    // id kept as "automotive" so browsers that remembered this card still pick it
    id: "automotive",
    name: "Electrical Components",
    tagline: "Terminals, connectors and switchgear.",
    Icon: Plug,
    guided: {
      title: "Missing screw detective",
      sample: "Terminals",
      finds: "missing screws, missing bars and blackened parts",
      photoNoun: "terminal",
    },
    own: { title: "My electrical inspection", example: "a missing screw or a cracked housing" },
  },
  {
    id: "electronics",
    name: "Electronics & PCB",
    tagline: "Tiny components. Big inspection questions.",
    Icon: Cpu,
    guided: {
      title: "PCB defect detective",
      sample: "PCB",
      finds: "missing holes, shorts, open circuits, spurs and more",
      photoNoun: "circuit board",
    },
    own: { title: "My circuit board inspection", example: "a missing component or a solder bridge" },
  },
  {
    id: "pharma",
    name: "Pharma Packaging",
    tagline: "Explore what makes packaging acceptable.",
    Icon: Pill,
    guided: {
      title: "Blister pack inspector",
      sample: "Blister Pack",
      finds: "empty and damaged pockets",
      photoNoun: "blister pack",
    },
    own: { title: "My packaging inspection", example: "an empty pocket or a torn foil" },
  },
  {
    id: "food",
    name: "Food & Beverages",
    tagline: "Explore the details behind everyday packs.",
    Icon: CupSoda,
    own: { title: "My food & beverage inspection", example: "a crooked label or a dented can" },
  },
  {
    id: "plastics",
    name: "Plastics & Precision Parts",
    tagline: "Investigate shape, finish and consistency.",
    Icon: Hexagon,
    own: { title: "My plastic parts inspection", example: "an incomplete moulding or a surface scratch" },
  },
  {
    id: "textiles",
    name: "Textiles",
    tagline: "Look closer at patterns, stains and fabric.",
    Icon: Shirt,
    own: { title: "My fabric inspection", example: "a stain or a pulled thread" },
  },
];

const sameProject = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

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
}> = ({ onStartMission, onChoosePlan }) => {
  const { user } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);
  const [samples, setSamples] = useState<Samples | null>(null);

  useEffect(() => {
    setSelected(readIndustry(user?.id));
  }, [user?.id]);

  // Which GSN samples and ready-made models exist decides which cards are live or "coming soon"
  useEffect(() => {
    getSamples()
      .then(setSamples)
      .catch(() => setSamples({ datasets: [], models: [] }));
  }, []);

  const pick = (id: string) => {
    setSelected(id);
    try {
      localStorage.setItem(storageKey(user?.id), id);
    } catch {
      // Remembering the choice is a convenience only
    }
  };

  const artIndex = Math.max(0, INDUSTRIES.findIndex((i) => i.id === selected));
  const industry = INDUSTRIES.find((i) => i.id === selected);

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
          </div>
          <div className="hidden rounded-xl border border-[#485840] p-2 sm:block">
            <IndustryArt index={artIndex} />
          </div>
        </div>
      </motion.section>

      {/* Industry cards */}
      <motion.section variants={fadeInUpVariants} aria-labelledby="industry-heading">
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
          {INDUSTRIES.map(({ id, name, tagline, Icon }, i) => {
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
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
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
        <Challenges industry={industry} samples={samples} onStartMission={onStartMission} onChoosePlan={onChoosePlan} />
      )}
    </>
  );
};

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
}> = ({ kicker, picture, title, children, action, soon, onLocked }) => (
  <article className={cn("flex flex-col rounded-xl border bg-background/40 p-4", soon && "opacity-75")}>
    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{kicker}</p>
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

const Challenges: React.FC<{
  industry: Industry;
  samples: Samples | null;
  onStartMission: (industryName: string, mission: Mission, mode: MissionMode) => void;
  onChoosePlan?: () => void;
}> = ({ industry, samples, onStartMission, onChoosePlan }) => {
  const artIndex = Math.max(0, INDUSTRIES.findIndex((i) => i.id === industry.id));
  const guided = industry.guided;
  const loading = samples === null;
  const sample = guided ? samples?.datasets.find((d) => sameProject(d.project, guided.sample)) : undefined;
  const model = guided
    ? samples?.models.find((m) => sameProject(m.project, guided.sample) && m.modelType !== "RF_DETR")
    : undefined;
  const guidedMission: Mission | null = guided ? { title: guided.title, sample: guided.sample } : null;

  return (
    <motion.section
      key={industry.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="challenge-heading"
      className="rounded-2xl border bg-card p-5 md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            02 / Pick your challenge
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
        Explore labelled examples, try a ready-made model, or build your own. Each path teaches the same inspection
        ideas.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 1. Guided challenge on GSN's sample */}
        <ChallengeCard
          kicker="01 · Guided challenge"
          title={guided?.title ?? "Guided challenge"}
          picture={
            sample ? (
              <AuthenticatedImage
                src={sampleDatasetThumbnailUrl(sample.id)}
                alt={`A labelled ${guided?.photoNoun ?? "sample"} photo from GSN's dataset`}
                className="h-full w-full object-cover"
              />
            ) : (
              <IndustryArt index={artIndex} />
            )
          }
          soon={!guided || (!loading && !sample) ? "Guided sample coming soon" : undefined}
          onLocked={onChoosePlan}
          action={
            guidedMission
              ? {
                  label: "Start guided challenge",
                  primary: true,
                  Icon: ArrowRight,
                  onClick: () => onStartMission(industry.name, guidedMission, "guided"),
                }
              : undefined
          }
        >
          {guided && sample ? (
            <>
              <strong className="font-medium text-foreground">
                {sample.totalImages} labelled {guided.photoNoun} photos
              </strong>{" "}
              from a real inspection line: find {guided.finds}. Explore the labels, train a model, then test it.
            </>
          ) : (
            "We're preparing a labelled GSN dataset for this industry. Start your own project meanwhile."
          )}
        </ChallengeCard>

        {/* 2. Quick try: GSN's trained model on the student's own photos */}
        <ChallengeCard
          kicker="02 · Quick try"
          title="Try a ready-made model"
          picture={
            <div className="relative h-full w-full">
              <IndustryArt index={artIndex} />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-[#e9ff65] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#171f1b]">
                <Sparkles className="h-3 w-3" aria-hidden="true" /> Trained by GSN
              </span>
            </div>
          }
          soon={!guided || (!loading && !model) ? "Ready-made model coming soon" : undefined}
          onLocked={onChoosePlan}
          action={
            guidedMission
              ? {
                  label: "Try the ready-made model",
                  Icon: Camera,
                  onClick: () => onStartMission(industry.name, guidedMission, "try"),
                }
              : undefined
          }
        >
          {guided && model ? (
            <>
              Already trained by GSN to spot {guided.finds}. Upload up to 30 photos of {guided.photoNoun}s and see what
              it finds in seconds. No labelling or training needed.
            </>
          ) : (
            "A model trained by GSN will let you test your own photos straight away. Not available for this industry yet."
          )}
        </ChallengeCard>

        {/* 3. The student's own project */}
        <ChallengeCard
          kicker="03 · Your own project"
          title={industry.own.title}
          picture={
            <ol className="flex h-full flex-col justify-center gap-2 px-5 text-xs text-[#f5f5ee]">
              {["Pick one defect", "Take 30–100 photos", "Upload & draw boxes", "Train and test"].map((step, i) => (
                <li key={step} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#e9ff65] text-[10px] text-[#e9ff65]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          }
          onLocked={onChoosePlan}
          action={{
            label: "Upload my images",
            Icon: Upload,
            onClick: () => onStartMission(industry.name, { title: industry.own.title }, "own"),
          }}
        >
          Pick one defect, e.g. {industry.own.example}. Take 30–100 photos, about half good and half with the defect, at
          the same angle and light. Then draw a box around each defect.
          <span className="mt-1 block text-xs">Up to 500 images, 5 MB each.</span>
        </ChallengeCard>
      </div>
    </motion.section>
  );
};

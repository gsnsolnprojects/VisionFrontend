import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Cog, Cpu, CupSoda, Hexagon, Pill, Shirt, type LucideIcon } from "lucide-react";
import { fadeInUpVariants } from "@/utils/animations";
import { IndustryArt } from "@/components/landing/IndustryArt";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

/**
 * Top of the Playground overview: "Pick a world" hero, the six industry cards and the picked
 * industry's three challenges. The picked industry is remembered per user in this browser and
 * drives the drawings (same drawings as the landing page, in the same order).
 */

interface Mission {
  title: string;
  /** guided missions come with ready sample images; the others start from the user's own */
  guided?: boolean;
}

interface Industry {
  id: string;
  name: string;
  tagline: string;
  Icon: LucideIcon;
  missions: [Mission, Mission, Mission];
}

const INDUSTRIES: Industry[] = [
  {
    id: "automotive",
    name: "Automotive Components",
    tagline: "Find the flaw. Understand the quality check.",
    Icon: Cog,
    missions: [
      { title: "Surface scratch detective", guided: true },
      { title: "Missing feature check" },
      { title: "Damaged edge explorer" },
    ],
  },
  {
    id: "electronics",
    name: "Electronics & PCB",
    tagline: "Tiny components. Big inspection questions.",
    Icon: Cpu,
    missions: [
      { title: "The missing component", guided: true },
      { title: "Orientation explorer" },
      { title: "Visible assembly defects" },
    ],
  },
  {
    id: "pharma",
    name: "Pharma Packaging",
    tagline: "Explore what makes packaging acceptable.",
    Icon: Pill,
    missions: [
      { title: "Label alignment lab", guided: true },
      { title: "Missing label check" },
      { title: "Carton damage explorer" },
    ],
  },
  {
    id: "food",
    name: "Food & Beverages",
    tagline: "Explore the details behind everyday packs.",
    Icon: CupSoda,
    missions: [
      { title: "Packaging defect explorer" },
      { title: "Label placement check" },
      { title: "Visible product variation" },
    ],
  },
  {
    id: "plastics",
    name: "Plastics & Precision Parts",
    tagline: "Investigate shape, finish and consistency.",
    Icon: Hexagon,
    missions: [
      { title: "Surface flaw explorer" },
      { title: "Incomplete moulding check" },
      { title: "Shape variation lab" },
    ],
  },
  {
    id: "textiles",
    name: "Textiles",
    tagline: "Look closer at patterns, stains and fabric.",
    Icon: Shirt,
    missions: [
      { title: "Fabric defect detective" },
      { title: "Stain spotting lab" },
      { title: "Pattern consistency check" },
    ],
  },
];

const GUIDED_COPY =
  "Explore ready-made sample images that are already labelled. A quick way to learn the workflow.";
const OWN_IMAGES_COPY =
  "Bring images of acceptable and defective examples. Practise consistent labelling and a focused inspection question.";

const storageKey = (userId?: string) => `visionm_playground_industry_${userId ?? "anon"}`;

const readIndustry = (userId?: string): string | null => {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
};

export const IndustryPicker: React.FC<{ onStartMission: () => void }> = ({ onStartMission }) => {
  const { user } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected(readIndustry(user?.id));
  }, [user?.id]);

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
              Good / Defective
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Pick a focused question. Explore examples, train a model and review what it gets wrong.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {industry.missions.map((mission, i) => (
              <article key={mission.title} className="flex flex-col rounded-xl border bg-background/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Mission {String(i + 1).padStart(2, "0")} · {mission.guided ? "Guided start" : "Your images"}
                </p>
                <div className="mt-3 overflow-hidden rounded-lg bg-[#171f1b]">
                  <IndustryArt index={artIndex} />
                </div>
                <h4 className="mt-4 font-semibold text-foreground">{mission.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {mission.guided ? GUIDED_COPY : OWN_IMAGES_COPY}
                </p>
                <div className="mt-auto space-y-2 pt-5">
                  {mission.guided && (
                    <Button className="w-full gap-1" onClick={onStartMission}>
                      Start guided challenge
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                  <Button variant="outline" className="w-full gap-1" onClick={onStartMission}>
                    Upload my images
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Guided samples are available for automotive scratches, missing PCB components and pharma label alignment.
            Choosing an industry sets your learning context; it does not load an industry-trained AI model.
          </p>
        </motion.section>
      )}
    </>
  );
};

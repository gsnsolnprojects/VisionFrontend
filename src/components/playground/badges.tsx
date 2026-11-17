import React from "react";
import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Boxes,
  Crosshair,
  Database,
  FileText,
  FlaskConical,
  GraduationCap,
  Layers,
  Lightbulb,
  Lock,
  PenLine,
  Search,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { BadgeTier } from "@/lib/api/badges";
import { cn } from "@/lib/utils";

/** Every Playground badge. The server decides who has earned which (services/playgroundBadgeService.js). */

export type BadgeGroup = "level1" | "level2" | "skill";

export interface BadgeInfo {
  id: string;
  name: string;
  group: BadgeGroup;
  Icon: LucideIcon;
  /** How to earn it, shown while it's locked */
  how: string;
  /** What the student learned or did, shown when it's awarded */
  learned: string;
  /** What comes next, on the award card */
  next?: string;
  /** Finishing a whole level: the bigger award */
  milestone?: boolean;
  /** For a badge with bronze, silver and gold: what each one takes */
  tiers?: [string, string, string];
}

export const BADGES: BadgeInfo[] = [
  {
    id: "data_explorer",
    name: "Data Explorer",
    group: "level1",
    Icon: Search,
    how: "Finish See the data in Level 1",
    learned: "You know what a dataset is, what labels are and why photos are split into groups.",
    next: "Next: draw your own labels.",
  },
  {
    id: "labelling_practice",
    name: "Labelling Practice",
    group: "level1",
    Icon: PenLine,
    how: "Label practice photos in Level 1",
    learned: "You drew your own labels and compared them with GSN's.",
    tiers: ["1 photo", "10 photos", "all 20 photos"],
    next: "Next: see how a model learns from labels like these.",
  },
  {
    id: "training_fundamentals",
    name: "Training Fundamentals",
    group: "level1",
    Icon: BookOpen,
    how: "Finish How training works in Level 1",
    learned: "You know the stages of training, what its settings do and how a model is scored.",
    next: "Next: test GSN's model.",
  },
  {
    id: "first_model_test",
    name: "First Model Test",
    group: "level1",
    Icon: FlaskConical,
    how: "Test GSN's model in Level 1",
    learned: "You tested a model and compared what it found with the right answers.",
    next: "Next: turn your test into a report.",
  },
  {
    id: "first_report",
    name: "First Inspection Report",
    group: "level1",
    Icon: FileText,
    how: "Make a report in Level 1",
    learned: "You turned test results into a report, the way a factory team shares them.",
  },
  {
    id: "vision_m_foundations",
    name: "Vision-M Foundations",
    group: "level1",
    Icon: Award,
    how: "Finish every step of Level 1",
    learned: "You finished Level 1 and saw how AI inspection works from photos to report.",
    next: "Next: build your own model in Level 2.",
    milestone: true,
  },
  {
    id: "dataset_builder",
    name: "Dataset Builder",
    group: "level2",
    Icon: Database,
    how: "Upload at least 10 of your own photos in Level 2",
    learned: "You started your own dataset with your own photos.",
    tiers: ["10 photos", "25 photos", "50 photos"],
    next: "Next: label them."
  },
  {
    id: "data_labeller",
    name: "Data Labeller",
    group: "level2",
    Icon: Boxes,
    how: "Label at least 10 of your own photos in Level 2",
    learned: "You labelled your own photos for a model to learn from.",
    tiers: ["10 photos", "25 photos", "50 photos"],
    next: "Next: train your model.",
  },
  {
    id: "model_trainer",
    name: "Model Trainer",
    group: "level2",
    Icon: GraduationCap,
    how: "Finish a training run in Level 2",
    learned: "You trained your own AI inspection model.",
    next: "Next: test it on photos it hasn't seen.",
  },
  {
    id: "model_evaluator",
    name: "Model Evaluator",
    group: "level2",
    Icon: Target,
    how: "Test your own model in Level 2",
    learned: "You measured how your own model really performs.",
    next: "Next: make a report of its results.",
  },
  {
    id: "inspection_reporter",
    name: "Inspection Reporter",
    group: "level2",
    Icon: BarChart3,
    how: "Make a report of your own model in Level 2",
    learned: "You reported your own model's results.",
  },
  {
    id: "vision_m_builder",
    name: "Vision-M Builder",
    group: "level2",
    Icon: Trophy,
    how: "Finish every step of Level 2",
    learned: "You built, trained, tested and reported on your own AI inspection model.",
    next: "Label more photos to make your model even better.",
    milestone: true,
  },
  {
    id: "accurate_labeller",
    name: "Accurate Labeller",
    group: "skill",
    Icon: Crosshair,
    how: "Score an average match of 60% or more in label practice",
    learned: "Your labels closely matched GSN's. Careful labels make better models.",
    tiers: ["60% match", "75% match", "90% match"],
  },
  {
    id: "no_hints_used",
    name: "No Hints Used",
    group: "skill",
    Icon: Lightbulb,
    how: "Label 5 practice photos well without a hint",
    learned: "You labelled photos well by yourself, without a single hint.",
    tiers: ["5 photos", "10 photos", "20 photos"],
  },
  {
    id: "high_accuracy_model",
    name: "High Accuracy Model",
    group: "skill",
    Icon: BadgeCheck,
    how: "Train your own model to a score of 50% or more",
    learned: "Your own model scored well on photos it had never seen.",
    tiers: ["50% score", "75% score", "90% score"],
  },
];

export const BADGE_GROUPS: { id: BadgeGroup; title: string; text: string; Icon: LucideIcon }[] = [
  { id: "level1", title: "Level 1: Learn", text: "Earned by working through a real GSN sample.", Icon: Layers },
  { id: "level2", title: "Level 2: Build", text: "Earned by building your own model.", Icon: Boxes },
  { id: "skill", title: "Skill", text: "Earned by doing the work especially well.", Icon: Crosshair },
];

export const badgeInfo = (id: string) => BADGES.find((b) => b.id === id);

/** Dark for Level 1, lime for Level 2, gold for skill, and an extra ring for finishing a level */
const MEDAL_COLORS: Record<BadgeGroup, { fill: string; ring: string; icon: string }> = {
  level1: { fill: "#171f1b", ring: "#e9ff65", icon: "#e9ff65" },
  level2: { fill: "#e9ff65", ring: "#171f1b", icon: "#171f1b" },
  skill: { fill: "#f2c14e", ring: "#8a6410", icon: "#3d2c05" },
};

/**
 * Bronze, silver and gold: a metal rim from light to dark, a raised face, the icon pressed into it,
 * and the tag's colours. Stars under the icon count the tier (1 to 3).
 */
const METALS: Record<BadgeTier, { rim: string[]; face: string[]; edge: string; icon: string; tag: string; tagText: string; stars: number }> = {
  bronze: {
    rim: ["#ffd9b5", "#dd915a", "#a65d2c", "#6b3612"],
    face: ["#f3bb8c", "#cf8247", "#99531f"],
    edge: "#5a2c0c",
    icon: "#3f1e06",
    tag: "linear-gradient(135deg, #f0b07c, #b8692f)",
    tagText: "#2e1504",
    stars: 1,
  },
  silver: {
    rim: ["#ffffff", "#e3e7ec", "#a9b2bc", "#6c7682"],
    face: ["#fbfcfd", "#d3d9df", "#9ba5b0"],
    edge: "#5b6570",
    icon: "#2c333c",
    tag: "linear-gradient(135deg, #f4f6f8, #a9b2bc)",
    tagText: "#262b31",
    stars: 2,
  },
  gold: {
    rim: ["#fff7c7", "#f7cd55", "#c9911b", "#865a06"],
    face: ["#ffeaa0", "#ecb93a", "#b67f0f"],
    edge: "#6e4a04",
    icon: "#4d3300",
    tag: "linear-gradient(135deg, #ffe37a, #d29a1d)",
    tagText: "#3d2a00",
    stars: 3,
  },
};

export const TIER_LABEL: Record<BadgeTier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
export const TIER_ORDER: BadgeTier[] = ["bronze", "silver", "gold"];

/** A small coloured tag naming the tier */
export const TierTag: React.FC<{ tier: BadgeTier; className?: string }> = ({ tier, className }) => (
  <span
    className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", className)}
    style={{ background: METALS[tier].tag, color: METALS[tier].tagText, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 1px rgba(0,0,0,0.12)" }}
  >
    {TIER_LABEL[tier]}
  </span>
);

const HEXAGON = "50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5";
/** The raised face inside a metal medal's rim */
const INNER_HEXAGON = "50,15 80.3,32.5 80.3,67.5 50,85 19.7,67.5 19.7,32.5";

const STAR = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 ? r * 0.45 : r;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(" ");

/** A bronze, silver or gold medal: shaded metal rim, raised face, shine, and stars for the tier */
const MetalMedal: React.FC<{ badge: BadgeInfo; tier: BadgeTier; size: number; className?: string }> = ({ badge, tier, size, className }) => {
  const id = React.useId().replace(/:/g, "");
  const metal = METALS[tier];
  const Icon = badge.Icon;
  const stars = Array.from({ length: metal.stars }, (_, i) => 50 + (i - (metal.stars - 1) / 2) * 12.5);
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.22))" }}>
        <defs>
          <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="1">
            {metal.rim.map((c, i) => (
              <stop key={i} offset={i / (metal.rim.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
          <radialGradient id={`face-${id}`} cx="0.38" cy="0.3" r="0.8">
            {metal.face.map((c, i) => (
              <stop key={i} offset={i / (metal.face.length - 1)} stopColor={c} />
            ))}
          </radialGradient>
          <linearGradient id={`shine-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`clip-${id}`}>
            <polygon points={INNER_HEXAGON} />
          </clipPath>
        </defs>
        <polygon points={HEXAGON} fill={`url(#rim-${id})`} stroke={metal.edge} strokeWidth={2} strokeLinejoin="round" />
        {/* The bevel: a dark line under the face's edge and a light one over it */}
        <polygon points={INNER_HEXAGON} fill="none" stroke={metal.edge} strokeOpacity={0.55} strokeWidth={3} strokeLinejoin="round" transform="translate(0 1)" />
        <polygon points={INNER_HEXAGON} fill={`url(#face-${id})`} stroke="#fff" strokeOpacity={0.6} strokeWidth={1.2} strokeLinejoin="round" />
        <g clipPath={`url(#clip-${id})`}>
          <ellipse cx="40" cy="20" rx="44" ry="20" fill={`url(#shine-${id})`} transform="rotate(-18 40 20)" />
        </g>
        {stars.map((cx) => (
          <polygon key={cx} points={STAR(cx, 74.5, 6)} fill={metal.icon} stroke="#fff" strokeOpacity={0.5} strokeWidth={1} strokeLinejoin="round" />
        ))}
      </svg>
      <Icon
        className="relative"
        style={{
          width: size * 0.34,
          height: size * 0.34,
          marginTop: -size * 0.1,
          color: metal.icon,
          filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.55))",
        }}
        strokeWidth={2.4}
      />
    </span>
  );
};
const OUTER_HEXAGON = "50,0 93.5,25 93.5,75 50,100 6.5,75 6.5,25";

export const BadgeMedal: React.FC<{ badge: BadgeInfo; earned?: boolean; tier?: BadgeTier | null; size?: number; className?: string }> = ({
  badge,
  earned = true,
  tier,
  size = 64,
  className,
}) => {
  // A badge with tiers is a metal medal: bronze until the server says otherwise
  if (earned && badge.tiers) return <MetalMedal badge={badge} tier={tier ?? "bronze"} size={size} className={className} />;
  const colors = MEDAL_COLORS[badge.group];
  const Icon = earned ? badge.Icon : Lock;
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {earned ? (
          <>
            {badge.milestone && <polygon points={OUTER_HEXAGON} fill="#f2c14e" />}
            <polygon points={HEXAGON} fill={colors.fill} stroke={colors.ring} strokeWidth={badge.milestone ? 3 : 4} strokeLinejoin="round" />
          </>
        ) : (
          <polygon points={HEXAGON} className="fill-muted stroke-border" strokeWidth={3} strokeLinejoin="round" />
        )}
      </svg>
      <Icon
        className={cn("relative", !earned && "text-muted-foreground")}
        style={{ width: size * (earned ? 0.42 : 0.3), height: size * (earned ? 0.42 : 0.3), color: earned ? colors.icon : undefined }}
      />
    </span>
  );
};
